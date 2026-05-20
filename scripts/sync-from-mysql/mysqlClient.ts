import mysql from 'mysql2/promise';

export interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getConfigFromEnv(): MysqlConfig {
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env: ${key}`);
    }
  }
  return {
    host: process.env.MYSQL_HOST!,
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER!,
    password: process.env.MYSQL_PASSWORD!,
    database: process.env.MYSQL_DATABASE!,
  };
}

export async function query<T>(config: MysqlConfig, sql: string, values?: mysql.ExecuteValues[]): Promise<T[]> {
  const conn = await mysql.createConnection({ ...config, timezone: '+08:00' });
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(sql, values);
    return rows as unknown as T[];
  } finally {
    await conn.end();
  }
}
