import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
async function actor(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('${admin}'),('${other}');`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202610300001_phase1.sql", "utf8"),
  );
  await db.exec(
    `insert into private.administrators(user_id) values('${admin}');`,
  );
});
afterAll(async () => {
  await db.close();
});
describe("migration em PostgreSQL PGlite (auth.uid simulado)", () => {
  it("impõe um só administrador", async () => {
    await db.exec("reset role");
    await expect(
      db.exec(`insert into private.administrators(user_id) values('${other}')`),
    ).rejects.toThrow();
  });
  it("persiste produto para o administrador e bloqueia proprietário diferente", async () => {
    await actor(admin);
    await db.query(
      `insert into public.products(owner_id,fingerprint,payload,provenance) values($1,'fixture','{"name":"Fixture de teste"}','manual')`,
      [admin],
    );
    const r = await db.query("select * from public.products");
    expect(r.rows).toHaveLength(1);
    await expect(
      db.query(
        `insert into public.products(owner_id,fingerprint,payload,provenance) values($1,'forged','{}','manual')`,
        [other],
      ),
    ).rejects.toThrow();
  });
  it("usuário diferente não lê nem escreve dados administrativos", async () => {
    await actor(other);
    expect((await db.query("select * from public.products")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query(
        `insert into public.products(owner_id,fingerprint,payload,provenance) values($1,'forged','{}','manual')`,
        [other],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("select public.consume_request('write')"),
    ).rejects.toThrow();
  });
  it("bloqueia usuário anônimo", async () => {
    await db.exec("reset role;set role anon");
    await expect(db.query("select * from public.products")).rejects.toThrow();
  });
  it("evita duplicação e preserva favorito com status e observações", async () => {
    await actor(admin);
    const { rows } = await db.query<{ id: string }>(
      "select id from public.products",
    );
    const id = rows[0].id;
    await expect(
      db.query(
        `insert into public.products(owner_id,fingerprint,payload,provenance) values($1,'fixture','{}','manual')`,
        [admin],
      ),
    ).rejects.toThrow();
    await db.query(
      `insert into public.favorites(owner_id,product_id,notes,status) values($1,$2,'Estudar depois','Interessante')`,
      [admin, id],
    );
    expect(
      (
        await db.query<{ notes: string; status: string }>(
          "select notes,status from public.favorites",
        )
      ).rows[0],
    ).toEqual({ notes: "Estudar depois", status: "Interessante" });
  });
  it("salva histórico e snapshots atomicamente, inclusive pesquisa vazia", async () => {
    await actor(admin);
    const { rows } = await db.query<{ id: string }>(
      "select id from public.products",
    );
    await db.query("select public.save_search($1,$2)", [
      {},
      JSON.stringify([{ id: rows[0].id, name: "Snapshot" }]),
    ]);
    await db.query("select public.save_search($1,$2)", [{}, "[]"]);
    expect(
      (await db.query("select * from public.mining_searches")).rows,
    ).toHaveLength(2);
    expect(
      (await db.query("select * from public.mining_results")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("select public.save_search($1,$2)", [
        {},
        JSON.stringify([{ id: other }]),
      ]),
    ).rejects.toThrow();
    expect(
      (await db.query("select * from public.mining_searches")).rows,
    ).toHaveLength(2);
  });
  it("limita análise a cinco chamadas por minuto entre processos", async () => {
    await actor(admin);
    for (let i = 0; i < 5; i++)
      expect(
        (
          await db.query<{ consume_request: boolean }>(
            "select public.consume_request('analysis')",
          )
        ).rows[0].consume_request,
      ).toBe(true);
    expect(
      (
        await db.query<{ consume_request: boolean }>(
          "select public.consume_request('analysis')",
        )
      ).rows[0].consume_request,
    ).toBe(false);
    await expect(
      db.query("update public.request_buckets set hits=0"),
    ).rejects.toThrow();
  });
  it("não permite marcar dados declarados como verificados", async () => {
    await actor(admin);
    await expect(
      db.query("update public.products set verified_at=now()"),
    ).rejects.toThrow();
  });
});
