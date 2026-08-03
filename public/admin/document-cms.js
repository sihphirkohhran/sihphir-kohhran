/**
 * Decap CMS hooks — normalize document paths and filenames on save.
 * Requires decap-cms.js to be loaded first.
 */
(function () {
  function sanitizeFilename(filename) {
    var raw = String(filename || '')
      .replace(/^.*[/\\]/, '')
      .trim();
    if (!raw) return 'document.pdf';
    var extMatch = raw.match(/(\.[a-z0-9]{2,8})$/i);
    var ext = extMatch ? extMatch[1].toLowerCase() : '.pdf';
    var base = extMatch ? raw.slice(0, -ext.length) : raw;
    var slug = base
      .toLowerCase()
      .replace(/[<>:"/\\|?*]+/g, '')
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return (slug || 'document') + ext;
  }

  function normalizePdfUrl(url) {
    if (!url || !String(url).trim()) return '';
    var value = String(url).trim().replace(/\\/g, '/');

    if (/^[a-zA-Z]:/.test(value) || value.indexOf(':/Users/') !== -1) {
      var match = value.match(/(?:public\/)?documents\/[^?#\s]+/i);
      return match ? '/' + match[0].replace(/^public\//, '') : '';
    }

    if (/^https?:\/\//i.test(value)) return value;

    value = value.replace(
      /^\/?src\/content\/documents\/[^/]+\/public\/documents\//,
      '/documents/',
    );
    value = value.replace(/^\/?public\/documents\//, '/documents/');

    if (value.indexOf('/documents/') === 0 || value.indexOf('/') === 0) {
      var parts = value.split('/');
      var file = parts.pop();
      parts.push(sanitizeFilename(decodeURIComponent(file)));
      return parts.join('/');
    }

    if (value.indexOf('documents/') === 0) {
      return normalizePdfUrl('/' + value);
    }

    return '/documents/' + sanitizeFilename(value);
  }

  function resolveDocumentUrl(fileUrl, externalUrl) {
    var file = normalizePdfUrl(fileUrl);
    if (file) return file;
    var external = (externalUrl || '').trim();
    if (/^https?:\/\//i.test(external)) return external;
    return normalizePdfUrl(external);
  }

  function notifyRegistrySync(message) {
    var text =
      message ||
      'Category lists updated. Press F5 to refresh admin and see new dropdown options.';
    var el = document.getElementById('registry-sync-notice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'registry-sync-notice';
      el.style.cssText =
        'position:fixed;bottom:16px;right:16px;z-index:99999;background:#0f1f3d;color:#f0e0a8;padding:12px 16px;border:1px solid #b8953f;border-radius:4px;font-family:system-ui,sans-serif;font-size:14px;max-width:360px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
      document.body.appendChild(el);
    }
    el.textContent = text;
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 14000);
  }

  function syncRegistryCategories() {
    fetch('/__admin_sync_registry', { method: 'POST' })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        notifyRegistrySync(data && data.message);
      })
      .catch(function () {
        notifyRegistrySync(
          'Categories saved. Run npm run sync:registry in terminal, then press F5.',
        );
      });
  }

  function register() {
    if (!window.CMS || !window.CMS.registerEventListener) return;

    window.CMS.registerEventListener({
      postSave: function (ref) {
        var collection = ref.collection && ref.collection.get('name');
        if (collection === 'archive_registry') {
          syncRegistryCategories();
        }
      },
      preSave: function (_ref) {
        var entry = _ref.entry;
        var data = entry.get('data');
        if (!data) return entry;

        var next = Object.assign({}, data);
        var resolved = resolveDocumentUrl(next.pdf_url, next.pdf_external);

        if (resolved) {
          next.pdf_url = resolved;
        } else if (next.pdf_url) {
          next.pdf_url = normalizePdfUrl(next.pdf_url);
        }

        if (next.pdf_external && next.pdf_url && /^https?:\/\//i.test(next.pdf_url)) {
          // External link stored in pdf_url from URL picker — keep as-is
        }

        return entry.set('data', next);
      },
    });
  }

  if (window.CMS) {
    register();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (window.CMS) {
          clearInterval(timer);
          register();
        } else if (tries > 50) {
          clearInterval(timer);
        }
      }, 100);
    });
  }
})();
