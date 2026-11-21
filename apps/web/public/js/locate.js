/* Raasta location helper. Plain ES5 so it runs on old phones. Shared by the static site and the Worker pages.
   - [data-locate] button: asks for GPS, rounds to 3 decimals (about 100 m), reverse geocodes on our server, fills
     the surrounding form's state and city fields and submits it (the server stores only state and city in a cookie).
   - [data-loc-label]: shows the saved city or state from the raasta_loc cookie. */
(function () {
  function readLoc() {
    var m = document.cookie.match(/(?:^|; )raasta_loc=([^;]*)/);
    if (!m) return null;
    var parts = decodeURIComponent(m[1]).split("|");
    return { state: parts[0] || "", city: parts[1] || "" };
  }

  function showSaved() {
    var loc = readLoc();
    if (!loc || !(loc.city || loc.state)) return;
    var labels = document.querySelectorAll("[data-loc-label]");
    for (var i = 0; i < labels.length; i++) labels[i].textContent = loc.city || loc.state;
    var chips = document.querySelectorAll("[data-loc-chip]");
    for (var j = 0; j < chips.length; j++) chips[j].className += " is-set";
  }

  function setStatus(form, text) {
    var s = form.querySelector("[data-locate-status]");
    if (s) s.textContent = text;
  }

  function locate(btn) {
    var form = btn.form || btn.closest("form");
    if (!form) return;
    var msg = {
      busy: btn.getAttribute("data-msg-busy") || "Finding you...",
      denied: btn.getAttribute("data-msg-denied") || "Location is off. Type your city instead.",
      fail: btn.getAttribute("data-msg-fail") || "Could not find your place. Type your city instead."
    };
    if (!navigator.geolocation) {
      setStatus(form, msg.fail);
      return;
    }
    btn.disabled = true;
    setStatus(form, msg.busy);
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = Math.round(pos.coords.latitude * 1000) / 1000;
        var lng = Math.round(pos.coords.longitude * 1000) / 1000;
        // Directions forms take the rounded start point directly (no reverse geocode needed).
        var from = form.querySelector("[name=from]");
        if (from) {
          from.value = lat + "," + lng;
          btn.disabled = false;
          form.submit();
          return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "/api/geo/reverse?lat=" + lat + "&lng=" + lng);
        xhr.onload = function () {
          btn.disabled = false;
          try {
            var r = JSON.parse(xhr.responseText);
            var st = form.querySelector("[name=state]");
            var ct = form.querySelector("[name=city]");
            if (st) st.value = r.state_code || r.state || "";
            if (ct) ct.value = r.district || r.city || "";
            if (r.state || r.city) form.submit();
            else setStatus(form, msg.fail);
          } catch (e) {
            setStatus(form, msg.fail);
          }
        };
        xhr.onerror = function () {
          btn.disabled = false;
          setStatus(form, msg.fail);
        };
        xhr.send();
      },
      function (err) {
        btn.disabled = false;
        setStatus(form, err && err.code === 1 ? msg.denied : msg.fail);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    );
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    while (t && t !== document) {
      if (t.getAttribute && t.getAttribute("data-locate") !== null) {
        e.preventDefault();
        locate(t);
        return;
      }
      t = t.parentNode;
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showSaved);
  else showSaved();
})();
