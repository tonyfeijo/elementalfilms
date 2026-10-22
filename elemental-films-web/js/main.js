/* ═══════════════════════════════════════════
   MININETFLIX — interacciones
   ═══════════════════════════════════════════ */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───── nav: sombra al hacer scroll ───── */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ───── nav: menú móvil ───── */
  const toggle = $("#navToggle");
  const links  = $("#navLinks");

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("is-locked", open);
  });

  $$("#navLinks a").forEach(a =>
    a.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("is-locked");
    })
  );

  /* ───── reveal al hacer scroll ───── */
  const revealables = $$(".reveal");

  // Red de seguridad: revela de inmediato lo que ya está en pantalla.
  // Necesaria porque IntersectionObserver no dispara en pestañas en
  // segundo plano o sin renderizado, y el contenido quedaría invisible.
  const revealVisible = () => {
    const limit = window.innerHeight * 0.92;
    revealables.forEach(el => {
      if (el.classList.contains("is-in")) return;
      if (el.getBoundingClientRect().top < limit) el.classList.add("is-in");
    });
  };

  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          obs.unobserve(e.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    revealables.forEach(el => io.observe(el));
    window.addEventListener("scroll", revealVisible, { passive: true });
    setTimeout(revealVisible, 1200);
  } else {
    revealables.forEach(el => el.classList.add("is-in"));
  }
  revealVisible();

  /* ───── contadores animados ───── */
  const stats = $$(".hero__stats dt");
  const countUp = el => {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    const target = parseInt(el.textContent.replace(/\D/g, ""), 10);
    if (!target) return;
    const suffix = el.textContent.replace(/[\d\s]/g, "");
    const dur = 1400;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window && !reduceMotion) {
    const io2 = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          countUp(e.target);
          obs.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );
    stats.forEach(el => io2.observe(el));
    // si el observer no dispara, los números se quedan en su valor final
    setTimeout(() => stats.forEach(countUp), 1200);
  }

  /* ───── filtro de trabajos ───── */
  const chips = $$(".chip");
  const works = $$(".work");

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => {
        c.classList.remove("is-active");
        c.setAttribute("aria-selected", "false");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-selected", "true");

      const filter = chip.dataset.filter;
      works.forEach(w => {
        const show = filter === "all" || w.dataset.cat === filter;
        w.classList.toggle("is-hidden", !show);
        if (show) {
          w.classList.remove("is-in");
          requestAnimationFrame(() => w.classList.add("is-in"));
        }
      });
    });
  });

  /* ───── spotlight en tarjetas ───── */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    $$(".card").forEach(card => {
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* ───── material de los trabajos: posters, vídeo y embeds ───── */

  // Convierte una URL de YouTube o Vimeo en su versión embebible.
  const toEmbed = url => {
    if (!url) return "";
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
    if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
    const vimeo = url.match(/vimeo\.com\/(?:[\w-]+\/)*(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return "";
  };

  // Resuelve una ruta relativa contra el documento.
  // Necesario porque las URLs de un background-image en CSS se resuelven
  // contra la hoja de estilos, no contra el HTML.
  const absUrl = src => {
    try {
      return new URL(src, document.baseURI).href;
    } catch {
      return src;
    }
  };

  const WORKS = $$(".work").map(el => ({
    el,
    title: el.querySelector(".work__meta h3")?.textContent.trim() || "",
    meta: el.querySelector(".work__meta p")?.textContent.trim() || "",
    img: el.dataset.img || "",
    video: el.dataset.video || "",
    embed: el.dataset.embed || "",
  }));

  // El poster de la tarjeta usa la imagen real si la hay.
  WORKS.forEach(w => {
    if (!w.img) return;
    const frame = w.el.querySelector(".work__frame");
    if (frame) frame.style.setProperty("--img", `url("${absUrl(w.img)}")`);
  });

  // Marca los trabajos con material y los hace accesibles con teclado.
  WORKS.forEach(w => {
    if (!w.img && !w.video && !w.embed) return;
    w.el.classList.add("has-media");
    w.el.setAttribute("tabindex", "0");
    w.el.setAttribute("role", "button");
    w.el.setAttribute("aria-label", `Ver ${w.title}`);
    w.el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(w);
      }
    });
  });

  /* ───── lightbox ───── */
  const lb = $("#lightbox");
  const lbMedia = $("#lbMedia");
  const lbTitle = $("#lbTitle");
  const lbMeta = $("#lbMeta");
  const lbCount = $("#lbCount");
  let lbList = [];
  let lbIndex = 0;
  let lbOpener = null;

  const renderWork = w => {
    if (w.embed) {
      const src = toEmbed(w.embed) || w.embed;
      return `<iframe src="${src}" title="${w.title}" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    }
    if (w.video) {
      return `<video controls autoplay playsinline preload="metadata" src="${absUrl(w.video)}"></video>`;
    }
    if (w.img) {
      return `<img src="${absUrl(w.img)}" alt="${w.title}" loading="lazy">`;
    }
    return `<p class="lb-fallback">Este trabajo todavía no tiene material multimedia.<br>El material definitivo está por confirmar.</p>`;
  };

  const paint = () => {
    const w = lbList[lbIndex];
    if (!w) return;
    lbMedia.innerHTML = renderWork(w);
    lbTitle.textContent = w.title;
    lbMeta.textContent = w.meta;
    lbCount.textContent = `${lbIndex + 1} / ${lbList.length}`;
  };

  function openLightbox(w) {
    lbOpener = document.activeElement;
    // solo navega entre los trabajos visibles con el filtro activo
    lbList = WORKS.filter(x => !x.el.classList.contains("is-hidden"));
    if (!lbList.length) lbList = WORKS;
    lbIndex = Math.max(0, lbList.indexOf(w));
    lb.hidden = false;
    document.body.classList.add("is-locked");
    paint();
    const close = $(".lightbox__close", lb);
    if (close) close.focus();
  }

  function closeLightbox() {
    lb.hidden = true;
    lbMedia.innerHTML = "";
    document.body.classList.remove("is-locked");
    if (lbOpener && lbOpener.focus) lbOpener.focus();
  }

  const stepLightbox = dir => {
    if (!lbList.length) return;
    lbIndex = (lbIndex + dir + lbList.length) % lbList.length;
    paint();
  };

  $$("[data-lb-close]", lb).forEach(el => el.addEventListener("click", closeLightbox));
  $("[data-lb-prev]", lb).addEventListener("click", () => stepLightbox(-1));
  $("[data-lb-next]", lb).addEventListener("click", () => stepLightbox(1));

  WORKS.forEach(w => {
    const frame = w.el.querySelector(".work__frame");
    if (frame) frame.addEventListener("click", () => openLightbox(w));
  });

  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") stepLightbox(-1);
    if (e.key === "ArrowRight") stepLightbox(1);
  });

  /* ───── modal del showreel ───── */
  const modal = $("#reelModal");
  const video = $("#reelVideo");
  const reelEmbed = $("#reelEmbed");
  const reelBtn = $("#reelBtn");
  const reelFoot = $("#reelFoot");
  const reelExternal = $("#reelExternal");
  const reelNote = $("#reelNote");
  // Ruta del showreel. Vacía = se muestra el aviso en lugar de un 404.
  const VIDEO_SRC = window.SHOWREEL_URL || "";

  const openModal = () => {
    modal.hidden = false;
    document.body.classList.add("is-locked");
    if (!VIDEO_SRC) return;

    const embed = toEmbed(VIDEO_SRC);
    if (embed) {
      reelEmbed.innerHTML = `<iframe src="${embed}" title="Showreel Elemental Films" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      reelEmbed.hidden = false;
      video.hidden = true;
      $(".modal__hint").hidden = true;

      // YouTube rechaza la incrustación si la página no envía cabecera Referer
      // (Error 153), cosa que pasa al abrir el archivo con file://.
      reelFoot.hidden = false;
      reelExternal.href = VIDEO_SRC;
      reelExternal.textContent = /vimeo\.com/i.test(VIDEO_SRC) ? "Abrir en Vimeo" : "Mirar en YouTube";
      if (location.protocol === "file:") {
        reelNote.textContent =
          "Estás abriendo el archivo directamente (file://), así que YouTube no admite el reproductor incrustado y mostrará un error. Sírvelo por http (Live Server o npx serve) para que funcione.";
        reelNote.hidden = false;
      }
      return;
    }

    video.src = VIDEO_SRC;
    video.hidden = false;
    $(".modal__hint").hidden = true;
    reelFoot.hidden = true;
    video.addEventListener("error", () => {
      video.hidden = true;
      $(".modal__hint").hidden = false;
    }, { once: true });
  };

  const closeModal = () => {
    modal.hidden = true;
    document.body.classList.remove("is-locked");
    video.pause();
    video.removeAttribute("src");
    reelEmbed.innerHTML = "";
    reelFoot.hidden = true;
    reelNote.hidden = true;
  };

  reelBtn.addEventListener("click", openModal);
  $$("[data-close]", modal).forEach(el => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  /* ───── año en el pie ───── */
  $$("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));
})();
