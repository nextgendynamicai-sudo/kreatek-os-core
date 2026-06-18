-- Script de Creación de Base de Datos para Kreatek Flow Systems OS
-- Cópialo y pégalo en el SQL Editor de Supabase y ejecútalo.

CREATE TABLE promotoras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  setups INTEGER DEFAULT 0,
  earningsEUR NUMERIC DEFAULT 0
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  promotoraId TEXT,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  avgBilling NUMERIC DEFAULT 0,
  phone TEXT,
  idCard TEXT,
  salesUSD NUMERIC DEFAULT 0,
  email TEXT,
  password TEXT,
  address TEXT
);

CREATE TABLE vendedores (
  id TEXT PRIMARY KEY,
  clientId TEXT,
  company TEXT,
  name TEXT NOT NULL,
  email TEXT,
  password TEXT
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  clientId TEXT,
  clientName TEXT,
  name TEXT NOT NULL,
  priceUSD NUMERIC DEFAULT 0,
  image TEXT
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  productId TEXT,
  amountUSD NUMERIC DEFAULT 0,
  kreatekFeeEUR NUMERIC DEFAULT 0
);

CREATE TABLE "kreatekCore" (
  id INTEGER PRIMARY KEY DEFAULT 1,
  totalTransactions INTEGER DEFAULT 0,
  earningsEUR NUMERIC DEFAULT 0
);

-- Insertar fila inicial para kreatekCore
INSERT INTO "kreatekCore" (id, totalTransactions, earningsEUR) VALUES (1, 0, 0) ON CONFLICT DO NOTHING;
