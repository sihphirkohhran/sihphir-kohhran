/**
 * Document save helpers for Decap CMS 3.x.
 *
 * Loaded after Decap CMS and before CMS.init(). This module only registers
 * save hooks; it does not initialize or otherwise control CMS bootstrap.
 */
(function () {
  "use strict";

  function sanitizeFilename(filename) {
    var raw = String(filename || "").replace(/^.*[/\\]/, "").trim();
    if (!raw) return "document.pdf";

    var extensionMatch = raw.match(/(\.[a-z0-9]{2,8})$/i);
    var extension = extensionMatch ? extensionMatch[1].toLowerCase() : ".pdf";
    var basename = extensionMatch ? raw.slice(0, -extension.length) : raw;
    var slug = basename
      .toLowerCase()
      .replace(/[<>:"/\\|?*]+/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return (slug || "document") + extension;
  }

  function normalizePdfUrl(value) {
    if (!value) return "";

    var url = String(value).trim().replace(/\\/g, "/");
    if (/^https?:\/\//i.test(url)) return url;

    url = url.replace(/^\/?public\/documents\//, "/documents/");
    url = url.replace(/^documents\//, "/documents/");

    if (url.indexOf("/documents/") === 0) {
      var segments = url.split("/");
      segments[segments.length - 1] = sanitizeFilename(segments[segments.length - 1]);
      return segments.join("/");
    }

    return "/documents/" + sanitizeFilename(url);
  }

  function resolveDocumentUrl(fileUrl, externalUrl) {
    return normalizePdfUrl(fileUrl) || (/^https?:\/\//i.test(externalUrl || "") ? externalUrl : "");
  }

  function registerDocumentEvents(CMS) {
    if (!CMS || typeof CMS.registerEventListener !== "function") return;
    if (window.__sihphirDocumentCmsEventsRegistered) return;

    CMS.registerEventListener({
      name: "preSave",
      handler: function (event) {
        var entry = event && event.entry;
        var data = entry && typeof entry.get === "function" ? entry.get("data") : null;

        if (!data || typeof data.get !== "function" || typeof data.set !== "function") return;

        return data.set(
          "pdf_url",
          resolveDocumentUrl(data.get("pdf_url"), data.get("pdf_external"))
        );
      }
    });

    CMS.registerEventListener({
      name: "postSave",
      handler: function () {
        console.log("Entry saved.");
      }
    });

    window.__sihphirDocumentCmsEventsRegistered = true;
  }

  registerDocumentEvents(window.CMS);
})();
