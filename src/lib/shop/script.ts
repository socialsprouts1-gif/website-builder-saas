/**
 * The shop, in the customer's browser.
 *
 * A basket belongs to the person holding it, and the person holding it has no
 * account — so it lives in their own storage and nowhere else. The server is
 * told about it exactly once, at checkout, and then it prices the whole thing
 * again from the database. Nothing this file computes is ever believed.
 *
 * Written as plain ES5 for the same reason the rest of a generated site is:
 * it runs on whatever phone the customer has.
 */
export const SHOP_SCRIPT = `(function () {
  var root = document.querySelector('meta[name="lumen-shop"]');
  if (!root) return;
  var KEY = 'lumen-cart:' + (root.getAttribute('content') || 'site');
  var BASE = root.getAttribute('data-base') || '';

  /* The same Indian grouping the server uses. The two have to agree: a basket
     that says one thing and an order confirmation that says another is the
     fastest way to lose a customer's trust. */
  function money(paise) {
    var value = Math.round(Number(paise) || 0);
    var rupees = Math.floor(Math.abs(value) / 100);
    var rest = Math.abs(value) % 100;
    var digits = String(rupees);
    var grouped = digits.length > 3
      ? digits.slice(0, -3).replace(/\\B(?=(\\d{2})+(?!\\d))/g, ',') + ',' + digits.slice(-3)
      : digits;
    return '₹' + grouped + (rest === 0 ? '' : '.' + (rest < 10 ? '0' + rest : String(rest)));
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(parsed) === '[object Array]' ? parsed : [];
    } catch (error) {
      /* Private browsing, blocked storage, a corrupted value. An empty basket
         is wrong but usable; a thrown error takes the whole shop down. */
      return [];
    }
  }

  function write(lines) {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (error) {}
    paint();
  }

  function count(lines) {
    var total = 0;
    for (var i = 0; i < lines.length; i++) total += Number(lines[i].quantity) || 0;
    return total;
  }

  function subtotal(lines) {
    var total = 0;
    for (var i = 0; i < lines.length; i++) {
      total += (Number(lines[i].price) || 0) * (Number(lines[i].quantity) || 0);
    }
    return total;
  }

  /* ---- the number beside the basket in the header --------------------- */
  function paint() {
    var lines = read();
    var total = count(lines);
    var badges = document.querySelectorAll('[data-shop-count]');
    for (var i = 0; i < badges.length; i++) {
      badges[i].textContent = String(total);
      if (total > 0) badges[i].removeAttribute('hidden');
      else badges[i].setAttribute('hidden', '');
    }
    drawCart();
    drawCheckout();
  }

  /* ---- adding ---------------------------------------------------------- */
  document.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('[data-shop-add]') : null;
    if (!button) return;
    event.preventDefault();

    var id = button.getAttribute('data-shop-add');
    var max = Number(button.getAttribute('data-shop-max')) || 99;
    var field = document.querySelector('[data-shop-qty]');
    var wanted = field ? Math.floor(Number(field.value) || 1) : 1;
    if (wanted < 1) wanted = 1;

    var lines = read();
    var found = null;
    for (var i = 0; i < lines.length; i++) if (lines[i].id === id) found = lines[i];

    if (found) found.quantity = Math.min(max, (Number(found.quantity) || 0) + wanted);
    else lines.push({
      id: id,
      title: button.getAttribute('data-shop-title') || 'Item',
      price: Number(button.getAttribute('data-shop-price')) || 0,
      image: button.getAttribute('data-shop-image') || '',
      slug: button.getAttribute('data-shop-slug') || '',
      max: max,
      quantity: Math.min(max, wanted)
    });

    write(lines);

    /* Said on the button itself, where the finger already is. A basket that
       fills silently reads as a button that did nothing. */
    var was = button.textContent;
    button.textContent = 'Added ✓';
    button.disabled = true;
    setTimeout(function () { button.textContent = was; button.disabled = false; }, 1200);
  });

  /* ---- the product gallery -------------------------------------------- */
  document.addEventListener('click', function (event) {
    var thumb = event.target.closest ? event.target.closest('[data-shop-thumb]') : null;
    if (!thumb) return;
    var main = document.querySelector('[data-shop-main]');
    if (main) main.setAttribute('src', thumb.getAttribute('data-shop-thumb'));
    var all = document.querySelectorAll('[data-shop-thumb]');
    for (var i = 0; i < all.length; i++) all[i].className = all[i].className.replace(' shop-thumb--on', '');
    thumb.className += ' shop-thumb--on';
  });

  /* ---- the basket page ------------------------------------------------- */
  function lineHtml(line) {
    var href = BASE + 'shop/' + encodeURIComponent(line.slug || '');
    var image = line.image
      ? '<div class="shop-line__image"><img src="' + escapeAttribute(line.image) + '" alt="" /></div>'
      : '<div class="shop-line__image"></div>';
    return '<div class="shop-line" data-shop-line="' + escapeAttribute(line.id) + '">'
      + image
      + '<div><p class="shop-line__title"><a href="' + escapeAttribute(href) + '">' + escapeText(line.title) + '</a></p>'
      + '<p class="shop-line__qty"><label>Qty <input type="number" min="1" max="' + (Number(line.max) || 99) + '" value="' + (Number(line.quantity) || 1) + '" data-shop-line-qty /></label>'
      + '<button type="button" class="shop-line__drop" data-shop-remove>Remove</button></p></div>'
      + '<div class="shop-line__money">' + money((Number(line.price) || 0) * (Number(line.quantity) || 0)) + '</div>'
      + '</div>';
  }

  function escapeText(value) {
    var node = document.createElement('span');
    node.textContent = String(value == null ? '' : value);
    return node.innerHTML;
  }

  function escapeAttribute(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function drawCart() {
    var host = document.querySelector('[data-shop-cart]');
    if (!host) return;
    var lines = read();
    var empty = host.querySelector('[data-shop-cart-empty]');
    var full = host.querySelector('[data-shop-cart-full]');
    var list = host.querySelector('[data-shop-cart-lines]');

    if (lines.length === 0) {
      if (empty) empty.removeAttribute('hidden');
      if (full) full.setAttribute('hidden', '');
      return;
    }
    if (empty) empty.setAttribute('hidden', '');
    if (full) full.removeAttribute('hidden');

    var html = '';
    for (var i = 0; i < lines.length; i++) html += lineHtml(lines[i]);
    if (list) list.innerHTML = html;

    var sum = host.querySelector('[data-shop-subtotal]');
    if (sum) sum.textContent = money(subtotal(lines));
  }

  document.addEventListener('change', function (event) {
    var field = event.target.closest ? event.target.closest('[data-shop-line-qty]') : null;
    if (!field) return;
    var row = field.closest('[data-shop-line]');
    if (!row) return;
    var id = row.getAttribute('data-shop-line');
    var lines = read();
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].id !== id) continue;
      var next = Math.floor(Number(field.value) || 1);
      if (next < 1) next = 1;
      if (next > (Number(lines[i].max) || 99)) next = Number(lines[i].max) || 99;
      lines[i].quantity = next;
    }
    write(lines);
  });

  document.addEventListener('click', function (event) {
    var drop = event.target.closest ? event.target.closest('[data-shop-remove]') : null;
    if (!drop) return;
    var row = drop.closest('[data-shop-line]');
    if (!row) return;
    var id = row.getAttribute('data-shop-line');
    var kept = [];
    var lines = read();
    for (var i = 0; i < lines.length; i++) if (lines[i].id !== id) kept.push(lines[i]);
    write(kept);
  });

  /* ---- checkout --------------------------------------------------------- */
  function chosenRate() {
    var picked = document.querySelector('[data-shop-ship]:checked');
    if (!picked) return null;
    var free = picked.getAttribute('data-shop-ship-free');
    return {
      id: picked.value,
      price: Number(picked.getAttribute('data-shop-ship-price')) || 0,
      freeOver: free === '' || free === null ? null : Number(free)
    };
  }

  function drawCheckout() {
    var host = document.querySelector('[data-shop-checkout]');
    if (!host) return;
    var done = host.querySelector('[data-shop-done]');
    if (done && !done.hasAttribute('hidden')) return;

    var lines = read();
    var empty = host.querySelector('[data-shop-cart-empty]');
    var form = host.querySelector('[data-shop-order]');

    if (lines.length === 0) {
      if (empty) empty.removeAttribute('hidden');
      if (form) form.setAttribute('hidden', '');
      return;
    }
    if (empty) empty.setAttribute('hidden', '');
    if (form) form.removeAttribute('hidden');

    var list = host.querySelector('[data-shop-checkout-lines]');
    if (list) {
      var html = '';
      for (var i = 0; i < lines.length; i++) {
        html += '<p class="shop-summary__line"><span>' + escapeText(lines[i].title) + ' × ' + (Number(lines[i].quantity) || 0)
          + '</span><span>' + money((Number(lines[i].price) || 0) * (Number(lines[i].quantity) || 0)) + '</span></p>';
      }
      list.innerHTML = html;
    }

    var items = subtotal(lines);
    var rate = chosenRate();
    var postage = rate ? (rate.freeOver !== null && items >= rate.freeOver ? 0 : rate.price) : 0;

    var sum = host.querySelector('[data-shop-subtotal]');
    var ship = host.querySelector('[data-shop-shipping]');
    var total = host.querySelector('[data-shop-total]');
    if (sum) sum.textContent = money(items);
    if (ship) ship.textContent = postage === 0 ? (rate ? 'Free' : '—') : money(postage);
    if (total) total.textContent = money(items + postage);
  }

  document.addEventListener('change', function (event) {
    if (event.target.closest && event.target.closest('[data-shop-ship]')) drawCheckout();
  });

  document.addEventListener('submit', function (event) {
    var form = event.target.closest ? event.target.closest('[data-shop-order]') : null;
    if (!form) return;
    event.preventDefault();

    var host = form.closest('[data-shop-checkout]');
    var status = host.querySelector('[data-shop-status]');
    var endpoint = host.getAttribute('data-shop-endpoint');
    var lines = read();

    if (!form.checkValidity()) {
      if (status) status.textContent = 'Please fill in your name, phone, address, town and PIN code.';
      form.reportValidity();
      return;
    }
    if (lines.length === 0 || !endpoint) {
      if (status) status.textContent = 'This basket is empty.';
      return;
    }

    var data = new FormData(form);
    var wanted = [];
    for (var i = 0; i < lines.length; i++) {
      wanted.push({ productId: lines[i].id, quantity: Number(lines[i].quantity) || 1 });
    }

    var rate = chosenRate();
    var button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Placing your order…';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lines: wanted,
        shippingRateId: rate ? rate.id : null,
        name: String(data.get('name') || ''),
        contact: String(data.get('phone') || ''),
        email: String(data.get('email') || ''),
        address: String(data.get('address') || ''),
        city: String(data.get('city') || ''),
        postcode: String(data.get('postcode') || ''),
        note: String(data.get('note') || ''),
        website: String(data.get('website') || '')
      })
    })
      .then(function (response) {
        return response.json().then(function (payload) {
          if (!response.ok) throw new Error(payload && payload.error ? payload.error : 'failed');
          return payload;
        });
      })
      .then(function (payload) {
        /* Emptied only once the order is genuinely on the server. An order
           that failed with an emptied basket is a customer who has to start
           again and usually does not. */
        write([]);

        var done = host.querySelector('[data-shop-done]');
        var reference = host.querySelector('[data-shop-reference]');
        var note = host.querySelector('[data-shop-done-note]');
        var pay = host.querySelector('[data-shop-pay]');

        if (reference) reference.textContent = payload.reference || '';
        if (note) note.textContent = payload.note || '';
        if (pay && payload.paymentUrl) {
          pay.setAttribute('href', payload.paymentUrl);
          pay.removeAttribute('hidden');
        }

        var chat = host.querySelector('[data-shop-whatsapp]');
        if (chat && payload.whatsappUrl) {
          chat.setAttribute('href', payload.whatsappUrl);
          chat.removeAttribute('hidden');
        }
        form.setAttribute('hidden', '');
        if (done) done.removeAttribute('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(function (error) {
        if (status) {
          status.textContent = (error && error.message && error.message !== 'failed')
            ? error.message
            : 'That did not go through. Please try again, or call us to order.';
        }
      })
      .then(function () {
        if (button) button.disabled = false;
      });
  });

  paint();
})();
`;
