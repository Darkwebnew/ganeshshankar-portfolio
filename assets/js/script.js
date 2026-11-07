(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.remove("show");
    void toastEl.offsetWidth; // restart the transition
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }

  /* ---------- Theme (cross-fade where supported) ---------- */
  var themeToggle = document.getElementById("themeToggle");
  function labelTheme() {
    if (!themeToggle) return;
    var light = root.getAttribute("data-theme") === "light";
    themeToggle.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
  }
  labelTheme();
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      var apply = function () {
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("portfolio-theme", next); } catch (e) {}
        labelTheme();
      };
      if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
      else apply();
    });
  }

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  function setMenu(open) {
    if (!navToggle || !nav) return;
    nav.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !e.target.closest(".header")) setMenu(false);
    });
  }

  /* ---------- Back-to-top button ---------- */
  var toTop = document.createElement("a");
  toTop.href = "#top";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  document.body.appendChild(toTop);

  /* Every "#top" link (logo and floating button) scrolls to the very top */
  document.querySelectorAll('a[href="#top"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    });
  });

  /* ---------- Scroll: header state, back-to-top, hero backdrop drift ---------- */
  var header = document.querySelector(".header");
  var hero = document.querySelector(".hero");
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY;
      if (header) header.classList.toggle("scrolled", y > 8);
      toTop.classList.toggle("show", y > window.innerHeight * 0.9);
      if (hero && !reduceMotion && y < window.innerHeight * 1.5) {
        hero.style.setProperty("--hero-shift", (y * 0.18).toFixed(1) + "px");
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal (staggered within each group) ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  } else {
    reveals.forEach(function (el) {
      var group = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains("reveal"); });
      el.style.transitionDelay = Math.min(group.indexOf(el), 4) * 70 + "ms";
    });
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        revealObs.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { revealObs.observe(el); });
  }

  /* ---------- Active nav link ---------- */
  var links = document.querySelectorAll(".nav a");
  if ("IntersectionObserver" in window) {
    var sectionObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + entry.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { sectionObs.observe(s); });
  }

  /* ---------- Buttons: soft light that follows the cursor ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty("--x", e.clientX - r.left + "px");
        btn.style.setProperty("--y", e.clientY - r.top + "px");
      });
    });
  }

  /* ---------- Résumé download confirmation ---------- */
  document.querySelectorAll('a[href$=".pdf"][download], a[href$=".docx"][download]').forEach(function (a) {
    a.addEventListener("click", function () { toast("Downloading résumé…"); });
  });

  /* ---------- Copy email (contact list) ---------- */
  var mail = document.querySelector('.contact-links a[href^="mailto:"]');
  if (mail && navigator.clipboard) {
    var address = mail.getAttribute("href").replace("mailto:", "");
    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy-btn";
    copy.textContent = "Copy";
    copy.setAttribute("aria-label", "Copy email address");
    mail.parentElement.classList.add("has-copy");
    mail.parentElement.appendChild(copy);
    copy.addEventListener("click", function () {
      navigator.clipboard.writeText(address).then(function () {
        copy.textContent = "Copied";
        copy.classList.add("done");
        toast("Email address copied");
        setTimeout(function () { copy.textContent = "Copy"; copy.classList.remove("done"); }, 2000);
      }, function () { toast("Couldn't copy. Email: " + address); });
    });
  }

  /* ---------- Smooth open/close for FAQ and "Full responsibilities" ---------- */
  if (!reduceMotion && Element.prototype.animate) {
    document.querySelectorAll(".faq details, details.more").forEach(function (d) {
      var summary = d.querySelector("summary");
      var busy = false;
      summary.addEventListener("click", function (e) {
        e.preventDefault();
        if (busy) return;
        busy = true;
        var start = d.offsetHeight;
        d.style.overflow = "hidden";
        if (d.open) {
          var end = summary.offsetHeight + (d.offsetHeight - d.clientHeight);
          d.classList.add("closing");
          var a = d.animate({ height: [start + "px", end + "px"] }, { duration: 280, easing: "cubic-bezier(.2,.7,.2,1)" });
          a.onfinish = function () { d.open = false; d.classList.remove("closing"); d.style.overflow = ""; busy = false; };
        } else {
          d.open = true;
          var full = d.offsetHeight;
          var b = d.animate({ height: [start + "px", full + "px"] }, { duration: 340, easing: "cubic-bezier(.2,.7,.2,1)" });
          b.onfinish = function () { d.style.overflow = ""; busy = false; };
        }
      });
    });
  }

  /* ---------- Contact form (EmailJS) ---------- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");
  if (!form || !status) return;

  form.fullName.addEventListener("input", function () {
    this.value = this.value.replace(/[^A-Za-z\s\-']/g, "");
  });

  // Message box grows with its content
  var msg = form.message;
  function autosize() { msg.style.height = "auto"; msg.style.height = Math.max(msg.scrollHeight + 2, 130) + "px"; }
  msg.addEventListener("input", autosize);

  var emailReady = false;
  function initEmail() {
    if (!emailReady && window.emailjs) {
      window.emailjs.init({ publicKey: "_IlupnzGymWLN63Oe" });
      emailReady = true;
    }
  }
  window.addEventListener("load", initEmail);

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = "form-status" + (kind ? " " + kind : "");
  }
  function flag(field, bad) {
    field.setAttribute("aria-invalid", bad ? "true" : "false");
    if (bad && !reduceMotion && field.animate) {
      field.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }],
        { duration: 320, easing: "ease-out" }
      );
    }
  }

  [form.fullName, form.workEmail, form.reason, form.message].forEach(function (f) {
    f.addEventListener("input", function () { if (f.getAttribute("aria-invalid") === "true") flag(f, false); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fullName = form.fullName.value.trim();
    var workEmail = form.workEmail.value.trim();
    var reason = form.reason.value.trim();
    var message = form.message.value.trim();

    if (!/^[A-Za-z\s\-']{2,}$/.test(fullName)) {
      flag(form.fullName, true);
      setStatus("Enter your full name using letters only.", "err");
      form.fullName.focus();
      return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(workEmail)) {
      flag(form.workEmail, true);
      setStatus("Enter a valid email address, like name@company.com.", "err");
      form.workEmail.focus();
      return;
    }
    if (!reason) {
      flag(form.reason, true);
      setStatus("Choose a reason for getting in touch.", "err");
      form.reason.focus();
      return;
    }
    if (!message) {
      flag(form.message, true);
      setStatus("Add a short message.", "err");
      form.message.focus();
      return;
    }

    initEmail();
    if (!window.emailjs) {
      setStatus("The form couldn't load. Email gane13298@gmail.com instead.", "err");
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector("span");
    btn.disabled = true;
    btn.classList.add("is-loading");
    label.textContent = "Sending…";
    setStatus("");

    window.emailjs.sendForm("service_dol2vxp", "template_jketii5", form)
      .then(function () {
        form.reset();
        autosize();
        btn.classList.remove("is-loading");
        btn.classList.add("is-success");
        label.textContent = "Message sent";
        setStatus("Thanks. I'll reply soon.", "ok");
        toast("Message sent");
        setTimeout(function () { btn.classList.remove("is-success"); label.textContent = "Send message"; }, 3200);
      })
      .catch(function (err) {
        console.error(err);
        btn.classList.remove("is-loading");
        label.textContent = "Send message";
        setStatus("Message not sent. Try again, or email gane13298@gmail.com.", "err");
      })
      .finally(function () { btn.disabled = false; });
  });
})();