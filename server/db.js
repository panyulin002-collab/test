import { paths, ensureDirs } from './config.js'
import { DatabaseSync } from 'node:sqlite'

let db = null

const SCHEMA = `
create table if not exists users (
  id            integer primary key autoincrement,
  username      text not null unique collate nocase,
  display_name  text not null,
  password_hash text not null,
  bio           text not null default '',
  avatar        text not null default '',
  created_at    text not null
);

create table if not exists posts (
  id           integer primary key autoincrement,
  user_id      integer not null references users(id) on delete cascade,
  slug         text not null,
  title        text not null,
  summary      text not null default '',
  content      text not null default '',
  cover        text not null default '',
  tags         text not null default '',
  status       text not null default 'draft',
  views        integer not null default 0,
  created_at   text not null,
  updated_at   text not null,
  published_at text
);

create unique index if not exists idx_posts_user_slug on posts(user_id, slug);
create index if not exists idx_posts_feed on posts(status, published_at desc);

create table if not exists sessions (
  token_hash text primary key,
  user_id    integer not null references users(id) on delete cascade,
  created_at text not null,
  expires_at text not null
);

create index if not exists idx_sessions_user on sessions(user_id);
`

/** 打开（并在需要时初始化）数据库，全局只创建一次 */
export function getDb() {
  if (db) return db
  ensureDirs()
  db = new DatabaseSync(paths.dbFile)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}

/** 查询多行，参数用数组按顺序传入 */
export function all(sql, params = []) {
  return getDb().prepare(sql).all(...params)
}

/** 查询一行，没有则返回 null */
export function get(sql, params = []) {
  return getDb().prepare(sql).get(...params) ?? null
}

/** 执行写入，返回 { changes, lastInsertRowid } */
export function run(sql, params = []) {
  return getDb().prepare(sql).run(...params)
}

/** 在一个事务里执行，出错自动回滚 */
export function tx(fn) {
  const database = getDb()
  database.exec('BEGIN')
  try {
    const result = fn()
    database.exec('COMMIT')
    return result
  } catch (error) {
    try {
      database.exec('ROLLBACK')
    } catch {
      /* 回滚失败时保留原始错误 */
    }
    throw error
  }
}
