import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { THEME } from '../../constants/theme';
import { formatDuration } from '../../utils/formatDuration';

interface ProgressBarProps {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  position,
  duration,
  onSeek,
}) => {
  const [barWidth, setBarWidth] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);

  // Safe numerical duration (guarded against 0, NaN, undefined)
  const safeDuration = duration && isFinite(duration) && duration > 0 ? duration : 0;

  // Mutable refs to prevent stale closure bugs in PanResponder
  const durationRef = useRef(safeDuration);
  durationRef.current = safeDuration;

  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const barWidthRef = useRef(barWidth);
  barWidthRef.current = barWidth;

  const isScrubbingRef = useRef(false);
  const scrubPositionRef = useRef(0);
  const startXRef = useRef(0);

  // Clear scrubbing and optimistic seek on track change (duration update)
  useEffect(() => {
    setIsScrubbing(false);
    isScrubbingRef.current = false;
    setPendingSeek(null);
    setScrubPosition(0);
    scrubPositionRef.current = 0;
  }, [duration]);

  // Synchronize optimistic seek state once TrackPlayer reports position close to target
  useEffect(() => {
    if (pendingSeek === null) return;
    if (Math.abs(position - pendingSeek) < 1.5) {
      setPendingSeek(null);
    }
  }, [position, pendingSeek]);

  // Fallback timer to release pendingSeek if audio stalls or buffers
  useEffect(() => {
    if (pendingSeek === null) return;
    const timer = setTimeout(() => {
      setPendingSeek(null);
    }, 1200);
    return () => clearTimeout(timer);
  }, [pendingSeek]);

  const updatePositionFromX = (x: number) => {
    const width = barWidthRef.current;
    const dur = durationRef.current;
    if (width <= 0 || dur <= 0) return;

    const clampedX = Math.max(0, Math.min(width, x));
    const ratio = clampedX / width;
    const targetSec = ratio * dur;

    setScrubPosition(targetSec);
    scrubPositionRef.current = targetSec;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 1;
      },
      // Prevent parent scroll views or modals from stealing the dragging gesture
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt, gestureState) => {
        if (durationRef.current <= 0 || barWidthRef.current <= 0) return;
        setIsScrubbing(true);
        isScrubbingRef.current = true;
        setPendingSeek(null);

        const locationX = evt.nativeEvent.locationX;
        const initialX =
          typeof locationX === 'number' && locationX >= 0
            ? locationX
            : Math.max(0, Math.min(barWidthRef.current, gestureState.x0));

        startXRef.current = initialX;
        updatePositionFromX(initialX);
      },

      onPanResponderMove: (_evt, gestureState) => {
        if (!isScrubbingRef.current) return;
        const currentX = startXRef.current + gestureState.dx;
        updatePositionFromX(currentX);
      },

      onPanResponderRelease: () => {
        if (!isScrubbingRef.current) return;
        const target = scrubPositionRef.current;
        setIsScrubbing(false);
        isScrubbingRef.current = false;
        setPendingSeek(target);

        // Commit single seekTo call to TrackPlayer
        onSeekRef.current(target);
      },

      onPanResponderTerminate: () => {
        setIsScrubbing(false);
        isScrubbingRef.current = false;
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setBarWidth(w);
      barWidthRef.current = w;
    }
  };

  // Display priority: active scrub -> optimistic seek -> live TrackPlayer position
  const activePosition = isScrubbing
    ? scrubPosition
    : pendingSeek !== null
    ? pendingSeek
    : position;

  const progressPercent =
    safeDuration > 0
      ? Math.min(100, Math.max(0, (activePosition / safeDuration) * 100))
      : 0;

  return (
    <View style={styles.container}>
      <View
        style={styles.touchArea}
        onLayout={onLayout}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        {...panResponder.panHandlers}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.progress, { width: `${progressPercent}%` }]} />
          <View
            style={[
              styles.thumb,
              isScrubbing && styles.thumbScrubbing,
              { left: `${progressPercent}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatDuration(activePosition)}</Text>
        <Text style={styles.timeText}>{formatDuration(safeDuration)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
  },
  touchArea: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  progress: {
    height: '100%',
    backgroundColor: THEME.colors.accent,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.colors.accentBright,
    marginLeft: -7,
    shadowColor: THEME.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbScrubbing: {
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    backgroundColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontFamily: THEME.typography.mono,
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
  },
});
