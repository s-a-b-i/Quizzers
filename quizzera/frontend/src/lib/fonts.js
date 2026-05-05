import { Playfair_Display } from 'next/font/google';

/** Brand display + auth page titles (Sign in, Create account, etc.) */
export const displaySerif = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});
