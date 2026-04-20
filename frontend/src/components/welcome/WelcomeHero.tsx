'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpenText, ArrowRight } from '@phosphor-icons/react';
import { useAuthContext } from '@/components/providers/AuthProvider';

const VISITED_KEY = 'lotus-academy-visited';

const springTransition = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 20,
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

const decorVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...springTransition, delay: 0.6 },
  },
};

export function WelcomeHero() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 等待鉴权状态加载完成
    if (authLoading) return;

    const hasVisited = localStorage.getItem(VISITED_KEY);
    if (hasVisited) {
      // 已访问过：根据页面偏好跳转
      if (user?.page_preference === 'private') {
        router.replace('/bookshelf/private');
      } else {
        router.replace('/bookshelf');
      }
      return;
    }
    setReady(true);
  }, [router, user, authLoading]);

  function handleEnter() {
    localStorage.setItem(VISITED_KEY, 'true');
    router.push('/bookshelf');
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex items-center">
      {/* Asymmetric split: left-heavy content, right decorative */}
      <div className="grid w-full grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 md:gap-12 px-4 py-8 md:px-0 md:py-0">
        {/* Left: Brand content — left-aligned, asymmetric */}
        <motion.div
          className="flex flex-col justify-center md:pl-8 lg:pl-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Icon badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)]">
              <BookOpenText size={18} weight="duotone" className="text-[var(--color-accent)]" />
              莲花书院
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl tracking-tighter leading-none font-sans text-[var(--color-text)]"
          >
            欢迎来到
            <br />
            <span className="text-[var(--color-accent)]">莲花书院</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-base md:text-lg text-[var(--color-text-muted)] leading-relaxed max-w-[50ch]"
          >
            一座安静的中文书城，在这里阅读、批注、分享。
            <br className="hidden md:block" />
            与志同道合的读者一起，探索文字的力量。
          </motion.p>

          {/* Enter button */}
          <motion.div variants={itemVariants} className="mt-10">
            <button
              onClick={handleEnter}
              className="group inline-flex items-center gap-3 rounded-full bg-[var(--color-accent)] px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] active:scale-[0.98]"
            >
              进入书院
              <ArrowRight
                size={20}
                weight="bold"
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </motion.div>
        </motion.div>

        {/* Right: Decorative element — asymmetric whitespace + floating accent */}
        <motion.div
          className="hidden md:flex items-center justify-center"
          variants={decorVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="relative">
            {/* Large decorative lotus circle */}
            <motion.div
              className="h-64 w-64 lg:h-80 lg:w-80 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-accent-muted)] flex items-center justify-center"
              animate={{
                y: [0, -12, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <BookOpenText
                size={80}
                weight="duotone"
                className="text-[var(--color-accent)]"
              />
            </motion.div>

            {/* Small floating accent dot */}
            <motion.div
              className="absolute -top-4 -right-4 h-8 w-8 rounded-full bg-[var(--color-accent)]"
              animate={{
                y: [0, -8, 0],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
            />

            {/* Another accent element */}
            <motion.div
              className="absolute -bottom-6 -left-6 h-5 w-5 rounded-full border-2 border-[var(--color-accent)]"
              animate={{
                y: [0, 6, 0],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
