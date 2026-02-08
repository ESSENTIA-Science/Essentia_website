 "use client";

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { gsap } from 'gsap';
// use your own icon import if react-icons is not available
import {
  GoArrowUpRight,
  GoPeople,
  GoRocket,
  GoFlame,
  GoCommentDiscussion,
  GoMail
} from 'react-icons/go';
import './CardNav.css';
import logoOutline from '../app/icon_outline.svg';
import logoOutlineWhite from '../app/icon_outline_white.svg';


type CardNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
};

export interface CardNavProps {
  logo: string;
  logoAlt?: string;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
}

const CardNav: React.FC<CardNavProps> = ({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const isAnimatingRef = useRef(false);
  const isExpandedRef = useRef(false); // 최신 상태 추적용 ref

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content') as HTMLElement;
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';

        void contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }
    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease
    });

    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

    // 이벤트 콜백 초기화
    tl.eventCallback('onComplete', null);
    tl.eventCallback('onReverseComplete', null);

    return tl;
  };

  // isExpanded 상태 변경 시 ref 동기화
  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;
    isAnimatingRef.current = false; // 타임라인 재생성 시 애니메이션 상태 초기화
    // ref도 현재 상태와 동기화
    isExpandedRef.current = isExpanded;

    return () => {
      tl?.kill();
      tlRef.current = null;
      isAnimatingRef.current = false;
    };
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      // Reset animation lock if the timeline is rebuilt during a mobile resize.
      isAnimatingRef.current = false;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(0);
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 50);
        ticking = false;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const target = event.target as Node | null;
      if (target && containerRef.current.contains(target)) return;
      
      // 애니메이션이 진행 중이면 무시
      if (isAnimatingRef.current) return;
      
      const tl = tlRef.current;
      if (!tl) return;
      
      // 애니메이션 시작
      isAnimatingRef.current = true;
      setIsHamburgerOpen(false);
      tl.eventCallback('onReverseComplete', null);
      tl.eventCallback('onReverseComplete', () => {
        setIsExpanded(false);
        isExpandedRef.current = false;
        isAnimatingRef.current = false;
      });
      tl.reverse();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isExpanded]);

  const toggleMenu = useCallback(() => {
    // 애니메이션이 진행 중이면 무시
    if (isAnimatingRef.current) {
      return;
    }

    const tl = tlRef.current;
    if (!tl) {
      return;
    }

    // ref를 사용하여 최신 상태 확인 (클로저 문제 방지)
    const currentExpanded = isExpandedRef.current;

    // 애니메이션 시작
    isAnimatingRef.current = true;

    if (!currentExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      isExpandedRef.current = true;
      // 이전 콜백 제거 후 새로 설정
      tl.eventCallback('onComplete', null);
      tl.eventCallback('onComplete', () => {
        isAnimatingRef.current = false;
      });
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      // 이전 콜백 제거 후 새로 설정
      tl.eventCallback('onReverseComplete', null);
      tl.eventCallback('onReverseComplete', () => {
        setIsExpanded(false);
        isExpandedRef.current = false;
        isAnimatingRef.current = false;
      });
      tl.reverse();
    }
  }, []);

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el;
  };
  const router = useRouter();
  return (
    <div
      ref={containerRef}
      className={`card-nav-container ${isScrolled ? 'scrolled' : 'initial'} ${isExpanded ? 'expanded' : ''} ${className}`}
    >
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor }}>
        <div className="card-nav-top">
          <div className="brand-group">
            <div className="logo-container" onClick={() => router.push("/")}>
              <img src={logo} alt={logoAlt} className="logo" />
            </div>
            <span className="logo-text">ESSENTIA Science</span>
          </div>

          <div className="nav-actions">
            <button
              type='button'
              className='nav-apply'
              aria-label='apply'
              onClick={() => router.push("/contact")}
            >입회 신청</button>
            <button
              type="button"
              className="nav-login"
              aria-label="Login"
              disabled={status === "loading"}
              onClick={() => router.push(session ? "/mypage" : "/login")}
            >
              {session ? "My Page" : "Login"}
            </button>
            <div
              className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
              onClick={toggleMenu}
              role="button"
              aria-label={isExpanded ? 'Close menu' : 'Open menu'}
              tabIndex={0}
              style={{ color: menuColor || '#000' }}
            >
              <div className="hamburger-line" />
              <div className="hamburger-line" />
            </div>
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          <div className="mobile-actions">
            <button
              type="button"
              className="nav-apply"
              aria-label="apply"
              onClick={() => router.push("/contact")}
            >
              입회 신청
            </button>
            <button
              type="button"
              className="nav-login"
              aria-label="Login"
              disabled={status === "loading"}
              onClick={() => router.push(session ? "/mypage" : "/login")}
            >
              {session ? "My Page" : "Login"}
            </button>
          </div>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
            >
              <div className="nav-card-label">{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <a key={`${lnk.label}-${i}`} className="nav-card-link" href={lnk.href} aria-label={lnk.ariaLabel}>
                    {(() => {
                      const Icon = lnk.icon ?? GoArrowUpRight;
                      return <Icon className="nav-card-link-icon" aria-hidden={true} />;
                    })()}
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

const NavBar = () => {
  const pathname = usePathname();
  const [isLightNav, setIsLightNav] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setIsLightNav(true);
      return;
    }
    const target = document.querySelector("#navBright");
    if (!target) {
      setIsLightNav(false);
      return;
    }
    const scrollRoot = document.querySelector("#scrollRoot");

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsLightNav(entry.isIntersecting);
      },
      { threshold: 0.5, root: scrollRoot instanceof Element ? scrollRoot : null }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [pathname]);

  const items = [
    {
      label: "About",
      bgColor: "#155462",
      textColor: "#fff",
      links: [
        { label: "Who We are", ariaLabel: "Who We are", href: "/about", icon: GoFlame },
        { label: "Members", ariaLabel: "About Members", href: "/members", icon: GoPeople }
      ]
    },
    {
      label: "Project", 
      bgColor: "rgba(35, 88, 100, 1)",
      textColor: "#fff",
      links: [
        { label: "Projects", ariaLabel: "Projects", href: "/projects", icon: GoRocket },
        { label: "ICAROS", ariaLabel: "ICAROS", href: "https://icaros.kr", icon: GoArrowUpRight }
      ]
    },
    {
      label: "Connect",
      bgColor: "#175c6c", 
      textColor: "#fff",
      links: [
        { label: "Forum", ariaLabel: "Forum", href: "/forum", icon: GoCommentDiscussion },
        // { label: "Join", ariaLabel: "Join", href: "#" },
        { label: "Contact", ariaLabel: "Contact", href: "/contact", icon: GoMail }
      ]
    }
  ];

  return (
    <CardNav
      logo={isLightNav ? logoOutline.src : logoOutlineWhite.src}
      items={items}
      baseColor={"#adadad2c"}
      className={isLightNav ? 'on-light' : ''}
    />
  );
};


export default NavBar;
