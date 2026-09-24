import Svg, { Path } from 'react-native-svg';

/**
 * Third-party marks for sign-in buttons. Geometry and colors are the providers' own and must not be
 * restyled, recolored or animated (Apple HIG: Sign in with Apple; Google Sign-In branding guidelines).
 */

/** Apple logo, single color. White on the black button, black on white/outlined buttons. */
export function AppleLogo({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path
      fill={color}
      d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
    />
  </Svg>;
}

/** The multicolor Google "G" (logo_googleg_48dp). Always full color, never monochrome. */
export function GoogleG({ size = 18 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path fill="#4285F4" d="M117.6 61.364c0-4.255-.382-8.346-1.091-12.273H60v23.21h32.291c-1.391 7.5-5.618 13.854-11.973 18.108v15.055h19.391C111.055 95.018 117.6 79.636 117.6 61.364z" />
    <Path fill="#34A853" d="M60 120c16.2 0 29.782-5.373 39.709-14.536L80.318 90.409c-5.373 3.6-12.245 5.727-20.318 5.727-15.627 0-28.855-10.554-33.573-24.736H6.382v15.545C16.255 106.555 36.545 120 60 120z" />
    <Path fill="#FBBC05" d="M26.427 71.4c-1.2-3.6-1.882-7.445-1.882-11.4s.682-7.8 1.882-11.4V33.055H6.382C2.318 41.155 0 50.318 0 60s2.318 18.845 6.382 26.945L26.427 71.4z" />
    <Path fill="#EA4335" d="M60 23.864c8.809 0 16.718 3.027 22.936 8.972l17.21-17.209C89.754 5.945 76.172 0 60 0 36.545 0 16.255 13.445 6.382 33.055L26.427 48.6C31.145 34.418 44.373 23.864 60 23.864z" />
  </Svg>;
}
