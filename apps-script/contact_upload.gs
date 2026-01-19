/**
 * Google Apps Script Web App: Contact form + optional file upload to Google Drive.
 *
 * Setup:
 * 1) Create a new Apps Script project.
 * 2) Paste this file.
 * 3) Set FOLDER_ID below to the Drive folder you want uploads to go into.
 * 4) Deploy -> New deployment -> Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5) Copy the Web app URL and set it in contact.html (CONTACT_UPLOAD_API).
 *
 * Notes:
 * - This endpoint is public. To reduce abuse, we keep strict allowlists and size limits.
 * - For large files, prefer asking users to paste a Drive link instead of uploading.
 */

const FOLDER_ID = "REPLACE_WITH_YOUR_DRIVE_FOLDER_ID";

const MAX_BYTES = 7 * 1024 * 1024; // 7MB raw file size limit (base64 overhead)
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_MIME_EXACT = ["application/pdf", "application/zip"];

function doGet() {
  return json_({ ok: true, service: "contact_upload", version: "2026-01-19" });
}

function doPost(e) {
  try {
    if (!FOLDER_ID || String(FOLDER_ID).indexOf("REPLACE_WITH_") === 0) {
      return json_({ ok: false, error: "server_not_configured" });
    }

    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    const data = JSON.parse(raw || "{}");

    // Basic bot trap (honeypot)
    if (typeof data.website === "string" && data.website.trim()) {
      return json_({ ok: true });
    }

    const type = safeStr_(data.type);
    const title = safeStr_(data.title);
    const message = safeStr_(data.message);
    const email = safeStr_(data.email);

    if (!type || !title || !message) {
      return json_({ ok: false, error: "missing_required_fields" });
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);

    let fileUrl = "";
    let fileName = "";

    if (data.attachment && typeof data.attachment === "object") {
      const att = data.attachment;
      fileName = safeFilename_(safeStr_(att.name)) || "attachment";
      const mimeType = safeStr_(att.type);
      const size = Number(att.size || 0);
      const b64 = safeStr_(att.base64);

      if (!mimeAllowed_(mimeType)) {
        return json_({ ok: false, error: "file_type_not_allowed" });
      }
      if (!b64) {
        return json_({ ok: false, error: "missing_file_data" });
      }
      if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
        return json_({ ok: false, error: "file_too_large" });
      }

      const bytes = Utilities.base64Decode(b64);
      if (bytes.length > MAX_BYTES) {
        return json_({ ok: false, error: "file_too_large" });
      }

      const blob = Utilities.newBlob(bytes, mimeType || "application/octet-stream", fileName);
      const file = folder.createFile(blob);
      file.setDescription(
        [
          "Contact form upload",
          "type=" + type,
          "title=" + title,
          email ? ("email=" + email) : "",
        ].filter(Boolean).join("\n")
      );
      fileUrl = file.getUrl();
    }

    // Store submission metadata in a lightweight Drive text file (optional).
    // This avoids needing Sheets setup, but you can change to SpreadsheetApp if you prefer.
    const stamp = new Date();
    const metaName = "contact_" + Utilities.formatDate(stamp, "Asia/Taipei", "yyyyMMdd_HHmmss") + ".txt";
    const metaBody = [
      "time: " + stamp.toISOString(),
      "type: " + type,
      "title: " + title,
      "email: " + (email || ""),
      "message:\n" + message,
      fileUrl ? ("fileUrl: " + fileUrl) : "",
    ].filter(Boolean).join("\n\n");
    folder.createFile(metaName, metaBody, MimeType.PLAIN_TEXT);

    return json_({ ok: true, fileUrl: fileUrl, fileName: fileName });
  } catch (err) {
    return json_({ ok: false, error: "server_error" });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeStr_(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function safeFilename_(name) {
  // Remove path-ish and control chars
  return name
    .replace(/[\\/\0\r\n\t]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function mimeAllowed_(mimeType) {
  if (!mimeType) return false;
  if (ALLOWED_MIME_EXACT.indexOf(mimeType) !== -1) return true;
  return ALLOWED_MIME_PREFIXES.some(function (p) { return mimeType.indexOf(p) === 0; });
}
