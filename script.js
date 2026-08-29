/* 丁柯个人网站 · 5 页导航控制器
 * 页面结构：1 首页 / 2 自我介绍 / 3 鹰眼产品 / 4 关键技术 / 5 实地应用
 * 1→2 与 2→3 保留原站电影级视频转场；3/4/5 之间使用平滑位移切换。
 */
const videos = {
  scene1: document.getElementById('scene1Video'),
  transition: document.getElementById('transitionVideo'),
  scene2: document.getElementById('scene2Video'),
  scene2Idle: document.getElementById('scene2IdleVideo'),
  scene3: document.getElementById('scene3Video'),
  scene3Loop: document.getElementById('scene3LoopVideo'),
};

const siteShell = document.querySelector('.site-shell');
const contentTrack = document.getElementById('contentTrack');
const introOverlay = document.getElementById('introOverlay');
const introEnterBtn = document.getElementById('introEnterBtn');
const introAudio = document.getElementById('introAudio');
const enterBtn = document.getElementById('enterBtn');
const progressBar = document.getElementById('progressBar');
const stateText = document.getElementById('stateText');
const navDots = [...document.querySelectorAll('.nav-dot')];
const mobilePrevBtn = document.querySelector('[data-mobile-prev]');
const mobileNextBtn = document.querySelector('[data-mobile-next]');

let isIntroActive = true;
let phase = 'scene1-idle';
let isLocked = false;
let transitionDuration = 8.833;
let scene2Duration = 8.767;
let scene2IdleStarted = false;
let lastWheelAt = 0;
let touchStartY = 0;
let touchStartX = 0;
let isTouching = false;
let lastTouchAt = 0;
let scene2SkipStarted = false;
let scene3LoopStarted = false;
let isScene2Leaving = false;
let scene2ExitTimer = null;
const scene2ExitDelay = 320;
const TOUCH_THRESHOLD = 60;
const TOUCH_THROTTLE_MS = 680;
const INTERACTIVE_TOUCH_SELECTOR = 'button, a, input, textarea, select, label, .audio-control-panel, .mobile-scene-controls';

const PHASE_SCENE = {
  'scene1-idle': 1,
  'transition': 2,
  'scene2-intro': 2,
  'scene2-idle': 2,
  'scene3-idle': 3,
  'scene4-idle': 4,
  'scene5-idle': 5,
  'transition-2-3': 3,
  'transition-3-2': 2,
  'transition-3-4': 4,
  'transition-4-3': 3,
  'transition-4-5': 5,
  'transition-5-4': 4,
};

const currentScene = () => PHASE_SCENE[phase] || 1;

/* 查找可滚动的祖先容器（算法卡片/荣誉面板等内部滚动区） */
const findScrollable = (target) => {
  let el = target;
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
    el = el.parentElement;
  }
  return null;
};

const canScrollFurther = (el, deltaY) => {
  if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  return el.scrollTop > 1;
};

const updateAppHeight = () => {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
};

const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;

const setRootDuration = () => {
  const ms = Math.max(1200, transitionDuration * 1000);
  document.documentElement.style.setProperty('--transition-ms', `${ms}ms`);
};

const readMetadata = async () => {
  await Promise.all(Object.values(videos).map(video => new Promise(resolve => {
    if (Number.isFinite(video.duration) && video.duration > 0) return resolve();
    video.addEventListener('loadedmetadata', resolve, { once: true });
  })));

  if (Number.isFinite(videos.transition.duration)) transitionDuration = videos.transition.duration;
  if (Number.isFinite(videos.scene2.duration)) scene2Duration = videos.scene2.duration;
  setRootDuration();
};

const showOnly = (visibleKeys) => {
  Object.entries(videos).forEach(([key, video]) => {
    const isVisible = visibleKeys.includes(key);
    if (!isVisible && key === 'scene1') video.style.opacity = '';
    video.classList.toggle('is-visible', isVisible);
  });
};

const safePlay = (video) => {
  const promise = video.play();
  if (promise && typeof promise.catch === 'function') {
    promise.catch(() => {});
  }
};

const waitForVideoReady = (video) => new Promise(resolve => {
  if (video.readyState >= 2) {
    resolve();
    return;
  }

  const done = () => {
    video.removeEventListener('loadeddata', done);
    video.removeEventListener('canplay', done);
    video.removeEventListener('error', done);
    resolve();
  };
  video.addEventListener('loadeddata', done, { once: true });
  video.addEventListener('canplay', done, { once: true });
  video.addEventListener('error', done, { once: true });
  video.load();
});

const runWhenVideoCompletes = (video, fallbackMs, callback) => {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    video.removeEventListener('ended', finish);
    window.clearTimeout(timer);
    callback();
  };
  const timer = window.setTimeout(finish, fallbackMs);
  video.addEventListener('ended', finish, { once: true });
};

const pauseExcept = (activeKeys) => {
  Object.entries(videos).forEach(([key, video]) => {
    if (!activeKeys.includes(key)) video.pause();
  });
};

const resetScene2Exit = ({ clearTimer = true } = {}) => {
  isScene2Leaving = false;
  if (clearTimer && scene2ExitTimer) {
    window.clearTimeout(scene2ExitTimer);
    scene2ExitTimer = null;
  }
};

const resetScene3Videos = () => {
  scene3LoopStarted = false;
  videos.scene3.onended = null;
  videos.scene3.pause();
  videos.scene3Loop.pause();
  videos.scene3.currentTime = 0;
  videos.scene3Loop.currentTime = 0;
  videos.scene3.style.transition = '';
  videos.scene3Loop.style.transition = '';
  videos.scene3.style.opacity = '0';
  videos.scene3Loop.style.opacity = '0';
  videos.scene3Loop.classList.remove('is-visible');
};

const playScene3Loop = () => {
  if (scene3LoopStarted) return;

  scene3LoopStarted = true;
  videos.scene3Loop.currentTime = 0;
  videos.scene3Loop.style.transition = 'opacity 420ms ease';
  videos.scene3.style.transition = 'opacity 420ms ease';
  videos.scene3Loop.classList.add('is-visible');
  safePlay(videos.scene3Loop);

  requestAnimationFrame(() => {
    videos.scene3Loop.style.opacity = '1';
    videos.scene3.style.opacity = '0';
  });

  window.setTimeout(() => {
    if (scene3LoopStarted) videos.scene3.pause();
  }, 460);
};

const playScene3Intro = async ({ holdVisibleKeys = [] } = {}) => {
  resetScene3Videos();
  videos.scene3.currentTime = 0;
  videos.scene3Loop.load();
  await waitForVideoReady(videos.scene3);

  showOnly([...holdVisibleKeys, 'scene3']);
  videos.scene3.onended = playScene3Loop;
  safePlay(videos.scene3);

  requestAnimationFrame(() => {
    videos.scene3.style.transition = 'opacity 0.8s ease';
    videos.scene3.style.opacity = '1';
  });

  if (holdVisibleKeys.length > 0) {
    window.setTimeout(() => {
      showOnly(['scene3']);
      holdVisibleKeys.forEach(key => {
        videos[key].pause();
      });
    }, 520);
  }
};

const handleEnter = async () => {
  if (!isIntroActive) return;

  if (window.audioControllerInstance) {
    try {
      await window.audioControllerInstance.play();
    } catch (error) {
      console.warn('音频自动播放失败（浏览器策略）', error);
    }
  }

  isIntroActive = false;
  introOverlay.classList.add('is-leaving');
  introOverlay.setAttribute('aria-hidden', 'true');

  introOverlay.addEventListener('transitionend', () => {
    introOverlay.hidden = true;
  }, { once: true });
  window.setTimeout(() => {
    introOverlay.hidden = true;
  }, 920);
};

const updateDots = (active) => {
  navDots.forEach(dot => {
    dot.classList.toggle('is-active', dot.dataset.go === active);
  });
};

const setPhase = (nextPhase) => {
  phase = nextPhase;
  document.body.dataset.phase = nextPhase.replace('-idle', '').replace('-intro', '');

  const label = {
    'scene1-idle': 'Scene 01 · Home',
    'transition': 'Transition 01 → 02',
    'scene2-intro': 'Scene 02 · 自我介绍',
    'scene2-idle': 'Scene 02 · 自我介绍',
    'scene3-idle': 'Scene 03 · 鹰眼智控 / 产品',
    'scene4-idle': 'Scene 04 · 鹰眼智控 / 技术',
    'scene5-idle': 'Scene 05 · 鹰眼智控 / 应用',
    'transition-2-3': 'Transition 02 → 03',
    'transition-3-2': 'Transition 03 → 02',
    'transition-3-4': 'Transition 03 → 04',
    'transition-4-3': 'Transition 04 → 03',
    'transition-4-5': 'Transition 04 → 05',
    'transition-5-4': 'Transition 05 → 04',
  }[nextPhase] || nextPhase;

  stateText.textContent = label;

  const sceneNum = PHASE_SCENE[nextPhase];
  if (sceneNum) updateDots(`scene${sceneNum}`);
};

const resetProgress = () => {
  progressBar.style.width = '0%';
};

const frameLoop = () => {
  if (phase === 'transition') {
    const pct = Math.min(100, (videos.transition.currentTime / transitionDuration) * 100);
    progressBar.style.width = `${pct}%`;
  }

  if (phase === 'scene2-intro') {
    const idleStart = Math.max(0, scene2Duration - 1.02);
    const pct = Math.min(100, (videos.scene2.currentTime / scene2Duration) * 100);
    progressBar.style.width = `${pct}%`;

    if (!scene2IdleStarted && videos.scene2.currentTime >= idleStart) {
      scene2IdleStarted = true;
      videos.scene2Idle.currentTime = 0;
      safePlay(videos.scene2Idle);
      showOnly(['scene2Idle']);
      setPhase('scene2-idle');
      pauseExcept(['scene2Idle']);
      progressBar.style.width = '100%';
      isLocked = false;
    }
  }

  requestAnimationFrame(frameLoop);
};

const goScene2 = async () => {
  if (isLocked || phase !== 'scene1-idle') return;
  isLocked = true;
  scene2IdleStarted = false;
  scene2SkipStarted = false;
  resetProgress();

  videos.scene1.style.opacity = '';
  contentTrack.classList.add('is-moving');
  setPhase('transition');
  showOnly(['transition']);
  pauseExcept(['transition']);

  videos.transition.currentTime = 0;
  safePlay(videos.transition);

  runWhenVideoCompletes(videos.transition, (transitionDuration * 1000) + 700, () => {
    if (phase !== 'transition') return;
    videos.scene2.style.transition = '';
    videos.scene2.style.opacity = '1';
    showOnly(['scene2']);
    pauseExcept(['scene2']);

    videos.scene2.currentTime = 0;
    setPhase('scene2-intro');
    safePlay(videos.scene2);
  });
};

const goScene1 = ({ force = false } = {}) => {
  if (!force && (isLocked || phase === 'transition')) return;
  isLocked = true;
  scene2IdleStarted = true;
  resetScene2Exit();

  contentTrack.classList.add('is-moving');
  contentTrack.style.transition = 'transform 520ms var(--ease-cinema)';
  contentTrack.style.transform = 'translate3d(0,0,0)';

  videos.transition.pause();
  videos.scene2.pause();
  videos.scene2Idle.pause();
  videos.transition.currentTime = 0;
  videos.scene2.currentTime = 0;
  videos.scene2Idle.currentTime = 0;
  videos.transition.style.opacity = '0';
  videos.scene2.style.opacity = '0';
  videos.scene2Idle.style.opacity = '0';
  videos.scene2.style.transition = '';
  videos.scene2Idle.style.transition = '';
  videos.scene1.style.opacity = '1';
  showOnly(['scene1']);
  pauseExcept(['scene1']);
  videos.scene1.currentTime = 0;
  safePlay(videos.scene1);

  document.body.dataset.phase = 'scene1';
  setTimeout(() => {
    contentTrack.classList.remove('is-moving');
    contentTrack.style.transition = '';
    contentTrack.style.transform = '';
    videos.transition.style.opacity = '';
    videos.scene2.style.opacity = '';
    videos.scene2Idle.style.opacity = '';
    videos.scene1.style.opacity = '';
    setPhase('scene1-idle');
    resetProgress();
    isLocked = false;
    scene2SkipStarted = false;

    window.dispatchEvent(new CustomEvent('scene:change', { detail: { scene: 1 } }));
  }, 560);
};

const goScene3 = ({ skipScene2Intro = false, fromScene2Exit = false } = {}) => {
  const canEnterFromScene2Intro = skipScene2Intro && phase === 'scene2-intro';
  if (scene2SkipStarted || (!canEnterFromScene2Intro && (isLocked || phase !== 'scene2-idle'))) return;

  if (canEnterFromScene2Intro) {
    scene2SkipStarted = true;
    scene2IdleStarted = true;
  }

  isLocked = true;
  contentTrack.classList.add('is-moving');
  contentTrack.style.transform = 'translate3d(-100vw,0,0)';
  setPhase('transition-2-3');

  const outgoingKey = canEnterFromScene2Intro ? 'scene2' : 'scene2Idle';
  videos[outgoingKey].style.transition = '';
  videos[outgoingKey].style.opacity = '1';

  setTimeout(async () => {
    if (phase !== 'transition-2-3') return;
    showOnly([outgoingKey]);

    await playScene3Intro({ holdVisibleKeys: [outgoingKey] });
    if (phase !== 'transition-2-3') return;

    contentTrack.style.transition = `transform ${transitionDuration * 1000}ms var(--ease-cinema)`;
    contentTrack.style.transform = 'translate3d(-200vw,0,0)';

    setTimeout(() => {
      if (phase !== 'transition-2-3') return;
      setPhase('scene3-idle');
      isLocked = false;
      scene2SkipStarted = false;
      resetScene2Exit({ clearTimer: false });

      window.dispatchEvent(new CustomEvent('scene:change', { detail: { scene: 3 } }));
    }, transitionDuration * 1000);

  }, fromScene2Exit ? 0 : (canEnterFromScene2Intro ? 120 : 800));
};

const startScene2ExitToScene3 = ({ skipScene2Intro = false } = {}) => {
  if (isScene2Leaving || scene2SkipStarted) return;
  if (phase !== 'scene2-idle' && phase !== 'scene2-intro') return;

  isScene2Leaving = true;
  isLocked = true;

  const visibleScene2Key = phase === 'scene2-idle' ? 'scene2Idle' : 'scene2';
  showOnly([visibleScene2Key]);
  safePlay(videos[visibleScene2Key]);

  scene2ExitTimer = window.setTimeout(() => {
    scene2ExitTimer = null;
    const shouldSkipIntro = skipScene2Intro && phase === 'scene2-intro';
    if (!shouldSkipIntro) isLocked = false;
    if (phase === 'scene2-intro') progressBar.style.width = '100%';
    goScene3({ skipScene2Intro: shouldSkipIntro, fromScene2Exit: true });
  }, scene2ExitDelay);
};

const skipScene2AndGoScene3 = () => {
  if (phase !== 'scene2-intro' || scene2SkipStarted) return;
  startScene2ExitToScene3({ skipScene2Intro: true });
};

const skipScene2AndGoScene1 = () => {
  if (phase !== 'scene2-intro' || scene2SkipStarted) return;

  scene2SkipStarted = true;
  videos.scene2.pause();
  goScene1({ force: true });
};

const goBackToScene2 = () => {
  if (isLocked || phase !== 'scene3-idle') return;
  isLocked = true;
  resetScene2Exit();

  videos.scene3.style.transition = 'opacity 0.8s ease';
  videos.scene3Loop.style.transition = 'opacity 0.8s ease';
  videos.scene3.style.opacity = '0';
  videos.scene3Loop.style.opacity = '0';

  setTimeout(() => {
    if (phase !== 'transition-3-2') return;
    resetScene3Videos();

    showOnly(['scene2Idle']);
    videos.scene2Idle.style.display = 'block';
    videos.scene2Idle.style.opacity = '0';
    videos.scene2Idle.currentTime = 0;
    safePlay(videos.scene2Idle);

    requestAnimationFrame(() => {
      videos.scene2Idle.style.transition = 'opacity 0.8s ease';
      videos.scene2Idle.style.opacity = '1';
    });

    contentTrack.style.transition = `transform ${transitionDuration * 1000}ms var(--ease-cinema)`;
    contentTrack.style.transform = 'translate3d(-100vw,0,0)';

    setTimeout(() => {
      if (phase !== 'transition-3-2') return;
      setPhase('scene2-idle');
      isLocked = false;

      window.dispatchEvent(new CustomEvent('scene:change', { detail: { scene: 2 } }));
    }, transitionDuration * 1000);

  }, 800);
};

const slideToScene = (target, transitionPhase) => {
  isLocked = true;
  contentTrack.classList.add('is-moving');
  contentTrack.style.transition = 'transform 900ms var(--ease-cinema)';
  contentTrack.style.transform = `translate3d(${-(target - 1) * 100}vw,0,0)`;
  setPhase(transitionPhase);

  setTimeout(() => {
    setPhase(`scene${target}-idle`);
    progressBar.style.width = '100%';
    isLocked = false;
    window.dispatchEvent(new CustomEvent('scene:change', { detail: { scene: target } }));
  }, 920);
};

const goScene4 = () => {
  if (isLocked || phase !== 'scene3-idle') return;
  slideToScene(4, 'transition-3-4');
};

const goBackToScene3 = () => {
  if (isLocked || phase !== 'scene4-idle') return;
  slideToScene(3, 'transition-4-3');
};

const goScene5 = () => {
  if (isLocked || phase !== 'scene4-idle') return;
  slideToScene(5, 'transition-4-5');
};

const goBackToScene4 = () => {
  if (isLocked || phase !== 'scene5-idle') return;
  slideToScene(4, 'transition-5-4');
};

/* 导航点直达：非相邻页面采用快速跳转（900ms 位移 + 背景视频切换） */
const quickJump = (target) => {
  const from = currentScene();
  isLocked = true;
  contentTrack.classList.add('is-moving');
  contentTrack.style.transition = 'transform 900ms var(--ease-cinema)';
  contentTrack.style.transform = `translate3d(${-(target - 1) * 100}vw,0,0)`;

  phase = `transition-${Math.min(from, target)}-${Math.max(from, target)}`;
  document.body.dataset.phase = `scene${target}`;
  updateDots(`scene${target}`);
  stateText.textContent = `Transition 0${from} → 0${target}`;

  if (target >= 3 && from <= 2) {
    videos.scene1.pause();
    videos.scene2.pause();
    videos.scene2Idle.pause();
    resetScene3Videos();
    videos.scene3Loop.currentTime = 0;
    videos.scene3Loop.style.transition = 'opacity 600ms ease';
    videos.scene3Loop.classList.add('is-visible');
    showOnly(['scene3Loop']);
    requestAnimationFrame(() => {
      videos.scene3Loop.style.opacity = '1';
    });
    safePlay(videos.scene3Loop);
    pauseExcept(['scene3Loop']);
    scene3LoopStarted = true;
  } else if (target <= 2 && from >= 3) {
    videos.scene3.style.transition = 'opacity 600ms ease';
    videos.scene3Loop.style.transition = 'opacity 600ms ease';
    videos.scene3.style.opacity = '0';
    videos.scene3Loop.style.opacity = '0';
    window.setTimeout(() => {
      if (PHASE_SCENE[phase] === target) resetScene3Videos();
    }, 620);

    const key = target === 1 ? 'scene1' : 'scene2Idle';
    videos.scene2Idle.style.display = 'block';
    videos[key].style.opacity = '0';
    showOnly([key]);
    requestAnimationFrame(() => {
      videos[key].style.transition = 'opacity 600ms ease';
      videos[key].style.opacity = '1';
    });
    safePlay(videos[key]);
    pauseExcept([key]);
  }

  window.setTimeout(() => {
    setPhase(`scene${target}-idle`);
    progressBar.style.width = '100%';
    isLocked = false;
    window.dispatchEvent(new CustomEvent('scene:change', { detail: { scene: target } }));
  }, 920);
};

const goToScene = (target) => {
  if (isIntroActive) return;
  if (target === 1) {
    if (currentScene() === 1) return;
    goScene1({ force: true });
    return;
  }

  if (isLocked) return;
  const from = currentScene();
  if (from === target) return;

  if (target === 2 && from === 1) return goScene2();
  if (target === 3 && from === 2) return startScene2ExitToScene3();
  if (target === 3 && from === 4) return goBackToScene3();
  if (target === 3 && from === 5) return quickJump(3);
  if (target === 4 && from === 3) return goScene4();
  if (target === 4 && from === 5) return goBackToScene4();
  if (target === 5 && from === 4) return goScene5();

  quickJump(target);
};

const navigateSceneByDirection = (direction) => {
  if (isIntroActive) return;
  if (isScene2Leaving) return;

  if (direction === 'next') {
    if (phase === 'scene1-idle') goScene2();
    else if (phase === 'scene2-intro') skipScene2AndGoScene3();
    else if (phase === 'scene2-idle') startScene2ExitToScene3();
    else if (phase === 'scene3-idle' && !isLocked) goScene4();
    else if (phase === 'scene4-idle' && !isLocked) goScene5();
    return;
  }

  if (isLocked && phase !== 'scene2-intro' && phase !== 'scene2-idle') return;
  if (phase === 'scene5-idle') goBackToScene4();
  else if (phase === 'scene4-idle') goBackToScene3();
  else if (phase === 'scene3-idle') goBackToScene2();
  else if (phase === 'scene2-intro') skipScene2AndGoScene1();
  else if (phase === 'scene2-idle') goScene1();
};

const handleWheel = (event) => {
  if (isIntroActive) return;
  if (isScene2Leaving) return;

  const scroller = findScrollable(event.target);
  if (scroller && canScrollFurther(scroller, event.deltaY)) return;

  event.preventDefault();

  if (phase === 'scene2-intro' && Math.abs(event.deltaY) > 18) {
    if (event.deltaY > 0) skipScene2AndGoScene3();
    else skipScene2AndGoScene1();
    return;
  }

  const now = Date.now();
  if (now - lastWheelAt < 700) return;
  lastWheelAt = now;
  if (Math.abs(event.deltaY) <= 18) return;

  navigateSceneByDirection(event.deltaY > 0 ? 'next' : 'prev');
};

let touchScroller = null;
let touchScrolled = false;

const handleTouchStart = (event) => {
  if (!isMobileViewport()) return;
  if (isIntroActive) return;
  if (event.target.closest(INTERACTIVE_TOUCH_SELECTOR)) return;

  isTouching = true;
  touchScrolled = false;
  touchScroller = findScrollable(event.target);
  touchStartY = event.touches[0].clientY;
  touchStartX = event.touches[0].clientX;
};

const handleTouchMove = (event) => {
  if (!isMobileViewport()) return;
  if (!isTouching) return;
  if (event.touches.length !== 1) return;

  const currentY = event.touches[0].clientY;
  const currentX = event.touches[0].clientX;
  const deltaY = currentY - touchStartY;
  const deltaX = currentX - touchStartX;

  if (Math.abs(deltaY) >= Math.abs(deltaX)) {
    if (touchScroller && canScrollFurther(touchScroller, -deltaY)) {
      touchScrolled = true;
      return;
    }
    event.preventDefault();
  }
};

const handleTouchEnd = (event) => {
  if (!isMobileViewport()) return;
  if (!isTouching) return;
  isTouching = false;
  if (isIntroActive) return;
  if (isScene2Leaving) return;

  const scrolledThisGesture = touchScrolled;
  touchScrolled = false;
  touchScroller = null;
  if (scrolledThisGesture) return;

  const endY = event.changedTouches[0].clientY;
  const endX = event.changedTouches[0].clientX;
  const deltaY = touchStartY - endY;
  const deltaX = touchStartX - endX;

  if (Math.abs(deltaY) < TOUCH_THRESHOLD || Math.abs(deltaY) < Math.abs(deltaX)) return;

  const now = Date.now();
  if (now - lastTouchAt < TOUCH_THROTTLE_MS) return;
  lastTouchAt = now;

  navigateSceneByDirection(deltaY > 0 ? 'next' : 'prev');
};

const warmUpAutoplay = () => {
  Object.values(videos).forEach(video => {
    video.muted = true;
    video.playsInline = true;
  });
  safePlay(videos.scene1);

  if (videos.scene3) {
    videos.scene3.currentTime = 0;
    videos.scene3.pause();
  }
  if (videos.scene3Loop) {
    videos.scene3Loop.currentTime = 0;
    videos.scene3Loop.pause();
  }
};

introEnterBtn.addEventListener('click', handleEnter);
enterBtn.addEventListener('click', goScene2);
window.addEventListener('wheel', handleWheel, { passive: false });
siteShell?.addEventListener('touchstart', handleTouchStart, { passive: true });
siteShell?.addEventListener('touchmove', handleTouchMove, { passive: false });
siteShell?.addEventListener('touchend', handleTouchEnd, { passive: true });
siteShell?.addEventListener('touchcancel', () => { isTouching = false; }, { passive: true });
window.addEventListener('resize', updateAppHeight);
window.visualViewport?.addEventListener('resize', updateAppHeight);
window.visualViewport?.addEventListener('scroll', updateAppHeight);
updateAppHeight();

mobilePrevBtn?.addEventListener('click', () => navigateSceneByDirection('prev'));
mobileNextBtn?.addEventListener('click', () => navigateSceneByDirection('next'));

navDots.forEach(dot => {
  const target = Number(dot.dataset.go?.replace('scene', ''));
  if (target) dot.addEventListener('click', () => goToScene(target));
});

readMetadata().then(() => {
  document.body.dataset.phase = 'scene1';
  setPhase('scene1-idle');
  showOnly(['scene1']);
  warmUpAutoplay();
  frameLoop();
});
