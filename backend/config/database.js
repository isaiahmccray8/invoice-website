const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Use /tmp for Railway compatibility (ephemeral storage), or local for development
const dbPath = process.env.NODE_ENV === 'production'
  ? '/tmp/invoices.db'
  : path.join(__dirname, '../invoices.db');
let db = null;

// Initialize database
const initializeDatabase = async () => {
  try {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    let filebuffer = null;
    if (fs.existsSync(dbPath)) {
      filebuffer = fs.readFileSync(dbPath);
    }

    db = filebuffer ? new SQL.Database(filebuffer) : new SQL.Database();

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        businessName TEXT NOT NULL,
        businessEmail TEXT NOT NULL,
        createdAt INTEGER,
        updatedAt INTEGER
      )
    `);

    // Invoices table
    db.run(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        invoiceNumber TEXT UNIQUE NOT NULL,
        clientName TEXT NOT NULL,
        clientEmail TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL DEFAULT 0,
        total REAL NOT NULL,
        paymentFee REAL DEFAULT 0,
        totalWithFee REAL NOT NULL,
        dueDate INTEGER NOT NULL,
        issueDate INTEGER,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        createdAt INTEGER,
        updatedAt INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Invoice items table
    db.run(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (invoiceId) REFERENCES invoices(id)
      )
    `);

    // Payments table
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        userId TEXT NOT NULL,
        amount REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        transactionId TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        clientEmail TEXT,
        clientName TEXT,
        paidAt INTEGER,
        createdAt INTEGER,
        FOREIGN KEY (invoiceId) REFERENCES invoices(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    saveDatabase();
    console.log('✅ SQLite Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
};

// Save database to file
const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// Wrapper to provide prepare-like interface
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        return new Promise((resolve, reject) => {
          try {
            if (!db) throw new Error('Database not initialized');
            db.run(sql, params);
            saveDatabase();
            resolve({ changes: 1 });
          } catch (error) {
            reject(error);
          }
        });
      },
      get: (...params) => {
        return new Promise((resolve, reject) => {
          try {
            if (!db) throw new Error('Database not initialized');
            const stmt = db.prepare(sql);
            stmt.bind(params);
            let result = null;
            if (stmt.step()) {
              result = stmt.getAsObject();
            }
            stmt.free();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      },
      all: (...params) => {
        return new Promise((resolve, reject) => {
          try {
            if (!db) throw new Error('Database not initialized');
            const stmt = db.prepare(sql);
            stmt.bind(params);
            const results = [];
            while (stmt.step()) {
              results.push(stmt.getAsObject());
            }
            stmt.free();
            resolve(results);
          } catch (error) {
            reject(error);
          }
        });
      }
    };
  },
  close: () => {
    return new Promise((resolve) => {
      if (db) {
        saveDatabase();
        db.close();
      }
      resolve();
    });
  }
};

// Initialize on startup
(async () => {
  await initializeDatabase();
})();

module.exports = dbWrapper;
