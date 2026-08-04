const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'rsvp.db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Unable to open RSVP database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS rsvp_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      attending TEXT NOT NULL,
      guest_count INTEGER,
      meal_pref TEXT,
      message TEXT,
      received_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.all(`PRAGMA table_info(rsvp_submissions)`, (err, columns) => {
    if (err) {
      console.error('Unable to inspect RSVP table schema:', err.message);
      return;
    }

    const hasEmail = columns.some((column) => column.name === 'email');
    if (!hasEmail) {
      db.run(`ALTER TABLE rsvp_submissions ADD COLUMN email TEXT`, (alterErr) => {
        if (alterErr) console.error('Failed to add email column to RSVP table:', alterErr.message);
      });
    }
  });
});

const defaultAdminEmails = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map((email) => email.trim()).filter(Boolean)
  : [];

const smtpConfig = process.env.SMTP_HOST
  ? {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    }
  : null;

const transporter = smtpConfig ? nodemailer.createTransport(smtpConfig) : null;

function isValidEmail(email) {
  return typeof email === 'string' && /\S+@\S+\.\S+/.test(email.trim());
}

function normalizeEmails(input) {
  if (!input) return [];
  const items = Array.isArray(input) ? input : String(input).split(',');
  return items
    .map((email) => email.trim())
    .filter((email) => isValidEmail(email));
}

function dbGet(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM admin_settings WHERE key = ?', [key], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.value : null);
    });
  });
}

function dbSet(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO admin_settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

async function getAdminEmails() {
  const stored = await dbGet('admin_emails');
  if (stored) {
    const emails = normalizeEmails(stored);
    if (emails.length > 0) return emails;
  }
  return defaultAdminEmails;
}

async function sendMail(options) {
  if (!transporter) {
    throw new Error('SMTP is not configured.');
  }
  return transporter.sendMail(options);
}

async function notifyAdmins(submission) {
  const adminEmails = await getAdminEmails();
  if (!transporter || adminEmails.length === 0) {
    console.warn('Admin notification skipped: SMTP or admin emails are not configured.');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@wedding-invite.local',
    to: adminEmails,
    subject: `New RSVP from ${submission.name}`,
    text: `New RSVP received:\n\nName: ${submission.name}\nEmail: ${submission.email}\nAttending: ${submission.attending}\nGuests: ${submission.guest_count}\nMeal: ${submission.meal_pref}\nMessage: ${submission.message || 'None'}\nReceived: ${submission.received_at}`,
    html: `
      <h2>New RSVP received</h2>
      <p><strong>Name:</strong> ${submission.name}</p>
      <p><strong>Email:</strong> ${submission.email}</p>
      <p><strong>Attending:</strong> ${submission.attending}</p>
      <p><strong>Guests:</strong> ${submission.guest_count}</p>
      <p><strong>Meal preference:</strong> ${submission.meal_pref}</p>
      <p><strong>Message:</strong> ${submission.message ? submission.message.replace(/\n/g, '<br>') : 'None'}</p>
      <p><strong>Received:</strong> ${submission.received_at}</p>
    `,
  };

  await sendMail(mailOptions);
}

async function notifyGuest(submission) {
  if (!transporter || process.env.SEND_USER_CONFIRMATION !== 'true' || !isValidEmail(submission.email)) {
    return false;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@wedding-invite.local',
    to: submission.email,
    subject: `Your RSVP for Oluwatobi & Ayodeji's wedding`,
    text: `Thank you for your RSVP, ${submission.name}!\n\nWe have received the following details:\nAttending: ${submission.attending}\nGuests: ${submission.guest_count}\nMeal preference: ${submission.meal_pref}\nMessage: ${submission.message || 'None'}\n\nWe look forward to celebrating with you on November 14, 2026.`,
    html: `
      <h2>Thank you for your RSVP</h2>
      <p>Hello ${submission.name},</p>
      <p>We have received your RSVP for Oluwatobi & Ayodeji's wedding.</p>
      <ul>
        <li><strong>Attending:</strong> ${submission.attending}</li>
        <li><strong>Guests:</strong> ${submission.guest_count}</li>
        <li><strong>Meal preference:</strong> ${submission.meal_pref}</li>
        <li><strong>Message:</strong> ${submission.message ? submission.message.replace(/\n/g, '<br>') : 'None'}</li>
      </ul>
      <p>We look forward to celebrating with you on November 14, 2026.</p>
    `,
  };

  await sendMail(mailOptions);
  return true;
}

app.post('/api/rsvp', async (req, res) => {
  const { name, email, attending, guestCount, mealPref, message } = req.body;

  if (!name || !attending) {
    return res.status(400).json({ error: 'Name and attendance selection are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const submission = {
    name: String(name).trim(),
    email: String(email).trim(),
    attending: String(attending).trim(),
    guest_count: Number(guestCount) || 1,
    meal_pref: String(mealPref || '').trim(),
    message: String(message || '').trim(),
    received_at: new Date().toISOString(),
  };

  db.run(
    `INSERT INTO rsvp_submissions (name, email, attending, guest_count, meal_pref, message, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [submission.name, submission.email, submission.attending, submission.guest_count, submission.meal_pref, submission.message, submission.received_at],
    async function (err) {
      if (err) {
        console.error('Failed to save RSVP:', err);
        return res.status(500).json({ error: 'Unable to save RSVP at this time.' });
      }

      try {
        await notifyAdmins(submission);
        await notifyGuest(submission);
        res.json({ success: true });
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError);
        res.status(500).json({ error: 'RSVP saved, but notification failed.' });
      }
    }
  );
});

app.get('/api/admin/emails', async (req, res) => {
  try {
    const emails = await getAdminEmails();
    res.json({ emails });
  } catch (err) {
    console.error('Failed to load admin emails:', err);
    res.status(500).json({ error: 'Unable to load admin emails.' });
  }
});

app.post('/api/admin/emails', async (req, res) => {
  const { emails } = req.body;
  const cleaned = normalizeEmails(emails);
  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'Provide at least one valid email address.' });
  }

  try {
    await dbSet('admin_emails', cleaned.join(', '));
    res.json({ success: true, emails: cleaned });
  } catch (err) {
    console.error('Failed to save admin emails:', err);
    res.status(500).json({ error: 'Unable to save admin emails.' });
  }
});

// Export all RSVPs as a CSV or JSON backup file.
app.get('/api/admin/export', (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();

  db.all(
    `SELECT id, name, email, attending, guest_count, meal_pref, message, received_at
     FROM rsvp_submissions ORDER BY id ASC`,
    (err, rows) => {
      if (err) {
        console.error('Failed to export RSVPs:', err);
        return res.status(500).json({ error: 'Unable to export RSVPs.' });
      }

      if (format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename="rsvp-backup.json"');
        return res.json(rows);
      }

      const headers = ['id', 'name', 'email', 'attending', 'guest_count', 'meal_pref', 'message', 'received_at'];
      const escapeCsv = (val) => {
        const str = val === null || val === undefined ? '' : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(',')),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="rsvp-backup.csv"');
      res.send(csvRows.join('\n'));
    }
  );
});

app.get('/api/rsvps', (req, res) => {
  db.all(`SELECT id, name, email, attending, guest_count, meal_pref, message, received_at FROM rsvp_submissions ORDER BY id DESC`, (err, rows) => {
    if (err) {
      console.error('Failed to fetch RSVP submissions:', err);
      return res.status(500).json({ error: 'Unable to load RSVP submissions.' });
    }
    res.json(rows);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Wedding invitation server listening on http://localhost:${PORT}`);
  if (!transporter) {
    console.warn('Admin notification disabled until SMTP is configured in .env.');
  }
});