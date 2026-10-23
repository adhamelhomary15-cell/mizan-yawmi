(function(){
  const root = document.getElementById('app');
  if (!window.preact || !window.preactHooks || !window.htm){
    root.innerHTML = '<p class="fail">الصفحة مقدرتش تحمّل مكتبة التشغيل. جرّب تفتحها تاني بعد شوية.</p>';
    return;
  }
  const { h, render, createContext } = preact;
  const { useState, useEffect, useRef, useMemo, useContext } = preactHooks;
  const html = htm.bind(h);

