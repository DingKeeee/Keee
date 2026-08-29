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
let scene2Duration = 8.767;
let scene2IdleStarted = false;
let transitionStartAt = 0;
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
/* 场景位移/转场固定时长：与背景视频时长解耦，切换永远流畅 */
const SCENE_SLIDE_MS = 1200;

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

/* 页级滚动容器（移动端/窄屏整页内容流）：滚到边界后允许切页 */
const PAGE_LEVEL_SCROLLER_SELECTOR = '.work-layout, .page-product';
/* 介绍板块区域（滚轮悬停其上时永远不切页） */
const PANEL_AREA_SELECTOR = '.awards-panel, .algo-card, .field-panel';

const isPageLevelScroller = (el) => !!(el && el.matches && el.matches(PAGE_LEVEL_SCROLLER_SELECTOR));

/* 键盘导航辅助：当前页介绍板块沿方向还可滚动时平滑滚动板块（不切页） */
const SCROLLABLE_PANEL_SELECTOR = '.awards-groups, .algo-card, .field-panel, .work-layout';

const scrollScenePanelsBy = (dir) => {
  const page = contentTrack?.children[currentScene() - 1];
  if (!page) return false;

  const panels = [...page.querySelectorAll(SCROLLABLE_PANEL_SELECTOR)];
  for (const panel of panels) {
    const style = window.getComputedStyle(panel);
    if (!/(auto|scroll)/.test(style.overflowY)) continue;
    if (panel.scrollHeight <= panel.clientHeight + 1) continue;
    if (canScrollFurther(panel, dir)) {
      panel.scrollBy({ top: dir * Math.max(80, panel.clientHeight * 0.85), behavior: 'smooth' });
      return true;
    }
  }
  return false;
};

const updateAppHeight = () => {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
};

const isMobileViewport = () => window.matchMedia('(max-width: 768px)').matches;

const setRootDuration = () => {
  document.documentElement.style.setProperty('--transition-ms', `${SCENE_SLIDE_MS}ms`);
};

const readMetadata = async () => {
  /* 每个视频最多等 2.6s：移动端网络慢或懒加载视频不下载元数据时，
   * 不能让整个初始化（背景显示/自动播放）无限期挂起 */
  const videoReady = (video) => new Promise(resolve => {
    if (Number.isFinite(video.duration) && video.duration > 0) return resolve();
    const done = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadedmetadata', done);
      video.removeEventListener('error', done);
      resolve();
    };
    const timer = window.setTimeout(done, 2600);
    video.addEventListener('loadedmetadata', done, { once: true });
    video.addEventListener('error', done, { once: true });
  });

  await Promise.all(Object.values(videos).map(videoReady));

  if (Number.isFinite(videos.scene2.duration) && videos.scene2.duration > 0) scene2Duration = videos.scene2.duration;
  setRootDuration();
};

/* 懒加载视频（preload=none）在使用前必须先触发加载，否则 currentTime/play 无效 */
const ensureLoaded = (video) => {
  if (video && video.readyState === 0) video.load();
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

/* 最多等 timeoutMs：弱网下视频数据迟迟不到时，转场照常完成（页面可操作是底线），
 * 视频数据到达后 play() 的 pending promise 会自动开始播放 */
const waitForVideoReady = (video, timeoutMs = 3500) => new Promise(resolve => {
  if (video.readyState >= 2) {
    resolve();
    return;
  }

  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    video.removeEventListener('loadeddata', done);
    video.removeEventListener('canplay', done);
    video.removeEventListener('error', done);
    resolve();
  };
  const timer = window.setTimeout(done, timeoutMs);
  video.addEventListener('loadeddata', done, { once: true });
  video.addEventListener('canplay', done, { once: true });
  video.addEventListener('error', done, { once: true });
  video.load();
});

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
  ensureLoaded(videos.scene3);
  ensureLoaded(videos.scene3Loop);
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
  await waitForVideoReady(videos.scene3, 3500);

  /* scene3 加载失败：直接切 loop 视频接替，避免背景永久黑屏 */
  if (videos.scene3.error) {
    playScene3Loop();
    return;
  }

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
    const startAudio = async () => {
      try {
        await window.audioControllerInstance.play();
      } catch (error) {
        console.warn('音频自动播放失败（浏览器策略）', error);
        window.setTimeout(() => {
          window.audioControllerInstance?.play().catch(() => {});
        }, 320);
      }
    };
    startAudio();
  }

  isIntroActive = false;
  introOverlay.classList.add('is-leaving');
  introOverlay.setAttribute('aria-hidden', 'true');

  /* 点击手势内重试背景视频：覆盖初始化时 play() 被浏览器策略拒绝的情况 */
  resumeVisibleVideos();

  /* 开屏视频退场后暂停，释放解码资源（移动端同时播放两路 21MB 视频会卡顿） */
  introOverlay.querySelector('.intro-bg-video')?.pause();
  introAudio?.pause();

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
    const pct = Math.min(100, ((Date.now() - transitionStartAt) / SCENE_SLIDE_MS) * 100);
    progressBar.style.width = `${pct}%`;
  }

  if (phase === 'scene2-intro') {
    const idleStart = Math.max(0, scene2Duration - 1.02);
    const pct = Math.min(100, (videos.scene2.currentTime / scene2Duration) * 100);
    progressBar.style.width = `${pct}%`;

    if (!scene2IdleStarted && videos.scene2.currentTime >= idleStart) {
      scene2IdleStarted = true;
      ensureLoaded(videos.scene2Idle);
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

  ensureLoaded(videos.transition);
  ensureLoaded(videos.scene2);
  ensureLoaded(videos.scene2Idle);
  videos.transition.currentTime = 0;
  videos.transition.loop = true;
  safePlay(videos.transition);
  transitionStartAt = Date.now();

  // 转场固定时长完成，不等待背景视频结束
  window.setTimeout(() => {
    if (phase !== 'transition') return;
    videos.scene2.style.transition = '';
    videos.scene2.style.opacity = '1';
    showOnly(['scene2']);
    pauseExcept(['scene2']);

    videos.scene2.currentTime = 0;
    setPhase('scene2-intro');
    safePlay(videos.scene2);

    /* 预热 scene3 系列：用户在 scene2 停留期间后台缓冲，到达 scene3 时背景立即可用 */
    ensureLoaded(videos.scene3);
    ensureLoaded(videos.scene3Loop);
  }, SCENE_SLIDE_MS);
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
  ensureLoaded(videos.transition);
  ensureLoaded(videos.scene2);
  ensureLoaded(videos.scene2Idle);
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

    contentTrack.style.transition = `transform ${SCENE_SLIDE_MS}ms var(--ease-cinema)`;
    contentTrack.style.transform = 'translate3d(-200vw,0,0)';

    setTimeout(() => {
      if (phase !== 'transition-2-3') return;
      setPhase('scene3-idle');
      isLocked = false;
      scene2SkipStarted = false;
      resetScene2Exit({ clearTimer: false });

      window.dispatchEvent(new CustomEvent('scene:change', { detail: { scene: 3 } }));
    }, SCENE_SLIDE_MS);

  }, fromScene2Exit ? 0 : (canEnterFromScene2Intro ? 120 : 160));
};

const startScene2ExitToScene3 = ({ skipScene2Intro = false } = {}) => {
  if (isScene2Leaving || scene2SkipStarted) return;
  if (phase !== 'scene2-idle' && phase !== 'scene2-intro') return;

  isScene2Leaving = true;
  isLocked = true;

  /* 去往 scene3 前确保两个视频都已触发加载（含直接从导航点进入的路径） */
  ensureLoaded(videos.scene3);
  ensureLoaded(videos.scene3Loop);

  const visibleScene2Key = phase === 'scene2-idle' ? 'scene2Idle' : 'scene2';
  ensureLoaded(videos[visibleScene2Key]);
  showOnly([visibleScene2Key]);
  safePlay(videos[visibleScene2Key]);

  scene2ExitTimer = window.setTimeout(() => {
    scene2ExitTimer = null;
    /* 等待期间页面已被切走：解除离开锁，放弃本次退出（防止永久锁死所有输入） */
    if (phase !== 'scene2-intro' && phase !== 'scene2-idle') {
      resetScene2Exit();
      return;
    }
    const shouldSkipIntro = phase === 'scene2-intro';
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
  setPhase('transition-3-2');
  resetScene2Exit();

  videos.scene3.style.transition = 'opacity 0.8s ease';
  videos.scene3Loop.style.transition = 'opacity 0.8s ease';
  videos.scene3.style.opacity = '0';
  videos.scene3Loop.style.opacity = '0';

  setTimeout(() => {
    if (phase !== 'transition-3-2') return;
    resetScene3Videos();

    showOnly(['scene2Idle']);
    ensureLoaded(videos.scene2Idle);
    videos.scene2Idle.style.display = 'block';
    videos.scene2Idle.style.opacity = '0';
    videos.scene2Idle.currentTime = 0;
    safePlay(videos.scene2Idle);

    requestAnimationFrame(() => {
      videos.scene2Idle.style.transition = 'opacity 0.8s ease';
      videos.scene2Idle.style.opacity = '1';
    });

    contentTrack.style.transition = `transform ${SCENE_SLIDE_MS}ms var(--ease-cinema)`;
    contentTrack.style.transform = 'translate3d(-100vw,0,0)';

    setTimeout(() => {
      if (phase !== 'transition-3-2') return;
      setPhase('scene2-idle');
      isLocked = false;

      window.dispatchEvent(new CustomEvent('scene:change', { detail: { scene: 2 } }));
    }, SCENE_SLIDE_MS);

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
    ensureLoaded(videos.scene3Loop);
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
    ensureLoaded(videos[key]);
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

  /* 介绍板块区域内（含触底/顶）：只吞掉滚轮，永不切页 */
  const overPanelArea = event.target?.closest?.(PANEL_AREA_SELECTOR) ||
    (scroller && !isPageLevelScroller(scroller));
  if (overPanelArea) {
    event.preventDefault();
    return;
  }

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

  const scroller = touchScroller;
  const scrolledThisGesture = touchScrolled;
  touchScrolled = false;
  touchScroller = null;
  if (scrolledThisGesture) return;

  const endY = event.changedTouches[0].clientY;
  const endX = event.changedTouches[0].clientX;
  const deltaY = touchStartY - endY;
  const deltaX = touchStartX - endX;

  if (Math.abs(deltaY) < TOUCH_THRESHOLD || Math.abs(deltaY) < Math.abs(deltaX)) return;

  /* 手势起始于介绍板块：永不切页（与桌面滚轮规则一致） */
  if (scroller && !isPageLevelScroller(scroller)) return;

  /* 页级容器：沿手势方向还能滚动时只滚内容，不切页 */
  if (scroller && canScrollFurther(scroller, deltaY > 0 ? 1 : -1)) return;

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
  // 背景视频全部循环播放，不因播放结束而停帧
  videos.transition.loop = true;
  videos.scene2.loop = true;
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

const handleKeydown = (event) => {
  if (isIntroActive) return;

  const target = event.target;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
  if (tag === 'BUTTON' && (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter')) return;

  const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space';

  if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'PageDown' || isSpace) {
    // 介绍板块未读完时优先滚动板块，不切页
    if (scrollScenePanelsBy(1)) return;
    event.preventDefault();
    navigateSceneByDirection('next');
    return;
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'PageUp') {
    if (scrollScenePanelsBy(-1)) return;
    event.preventDefault();
    navigateSceneByDirection('prev');
    return;
  }

  if (event.key === 'Home') {
    if (currentScene() !== 1) {
      event.preventDefault();
      goToScene(1);
    }
    return;
  }

  if (event.key === 'End') {
    if (currentScene() !== 5) {
      event.preventDefault();
      goToScene(5);
    }
    return;
  }

  if (/^[1-5]$/.test(event.key)) {
    goToScene(Number(event.key));
  }
};

introEnterBtn.addEventListener('click', handleEnter);
enterBtn.addEventListener('click', goScene2);
window.addEventListener('wheel', handleWheel, { passive: false });
window.addEventListener('keydown', handleKeydown);
siteShell?.addEventListener('touchstart', handleTouchStart, { passive: true });
siteShell?.addEventListener('touchmove', handleTouchMove, { passive: false });
siteShell?.addEventListener('touchend', handleTouchEnd, { passive: true });
siteShell?.addEventListener('touchcancel', () => { isTouching = false; }, { passive: true });

/* 移动端播放兜底：iOS 锁屏/切后台会暂停所有视频且不自动恢复；低电量/省流量
 * 模式下 setTimeout 里的 play() 因丢失手势上下文被拒；蜂窝网络 iOS 忽略 preload，
 * 视频 若从未成功 play 过则连首帧都不会加载。在真实手势与页面重新可见时重试。 */
const resumeVisibleVideos = () => {
  if (isIntroActive) return;
  Object.values(videos).forEach(video => {
    if (video.classList.contains('is-visible') && video.paused) {
      ensureLoaded(video);
      safePlay(video);
    }
  });
};

siteShell?.addEventListener('pointerdown', resumeVisibleVideos, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) window.setTimeout(resumeVisibleVideos, 80);
});
videos.scene1.addEventListener('canplay', () => {
  if (!isIntroActive && videos.scene1.classList.contains('is-visible')) safePlay(videos.scene1);
});

/* 低电量模式下开屏视频 autoplay 同样会被拒：点击开屏任意处即重试 */
const introBgVideo = introOverlay?.querySelector('.intro-bg-video');
introOverlay?.addEventListener('pointerdown', () => {
  if (isIntroActive && introBgVideo?.paused) safePlay(introBgVideo);
}, { passive: true });

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
