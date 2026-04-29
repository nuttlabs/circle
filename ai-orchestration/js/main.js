(function () {
  var inv = new URLSearchParams(window.location.search).get('inv');
  if (inv) localStorage.setItem('inv', inv);
  var stored = localStorage.getItem('inv');
  if (stored) {
    document.querySelectorAll('.cta-button').forEach(function (el) {
      var url = new URL(el.href, window.location.href);
      url.searchParams.set('client_reference_id', 'inv-' + stored);
      el.href = url.toString();
    });
  }
})();

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tab')[0].classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

(function () {
  document.querySelectorAll('.accordion-trigger').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var scrollX = window.scrollX;
      var scrollY = window.scrollY;
      function restoreScroll() {
        if (Math.abs(window.scrollY - scrollY) > 1) {
          window.scrollTo(scrollX, scrollY);
        }
      }
      var expanded = trigger.getAttribute('aria-expanded') === 'true';
      var panelId = trigger.getAttribute('aria-controls');
      var panel = panelId ? document.getElementById(panelId) : null;
      trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if (panel) {
        if (expanded) {
          panel.setAttribute('hidden', '');
        } else {
          panel.removeAttribute('hidden');
        }
      }
      requestAnimationFrame(function () {
        restoreScroll();
        requestAnimationFrame(restoreScroll);
      });
    });
  });
})();
