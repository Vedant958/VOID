import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../store/useThemeStore';
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
  const { theme } = useTheme();
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
    }, 4000);
    return () => clearTimeout(timer);
  }, [pendingSeek]);

  const onLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const calculatePositionFromX = (locationX: number) => {
    const w = barWidthRef.current;
    const d = durationRef.current;
    if (w <= 0 || d <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, locationX / w));
    return ratio * d;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        isScrubbingRef.current = true;
        setIsScrubbing(true);
        startXRef.current = evt.nativeEvent.locationX;
        const newPos = calculatePositionFromX(evt.nativeEvent.locationX);
        scrubPositionRef.current = newPos;
        setScrubPosition(newPos);
      },

      onPanResponderMove: (evt, gestureState) => {
        const curX = startXRef.current + gestureState.dx;
        const newPos = calculatePositionFromX(curX);
        scrubPositionRef.current = newPos;
        setScrubPosition(newPos);
      },

      onPanResponderRelease: () => {
        const finalPos = scrubPositionRef.current;
        isScrubbingRef.current = false;
        setIsScrubbing(false);
        setPendingSeek(finalPos);
        onSeekRef.current(finalPos);
      },

      onPanResponderTerminate: () => {
        isScrubbingRef.current = false;
        setIsScrubbing(false);
      },
    })
  ).current;

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
        <View style={[styles.track, { backgroundColor: theme.colors.surfaceSubtle }]} pointerEvents="none">
          <View style={[styles.progress, { width: `${progressPercent}%`, backgroundColor: theme.colors.accent }]} />
          <View
            style={[
              styles.thumb,
              {
                left: `${progressPercent}%`,
                backgroundColor: theme.colors.accentBright,
                shadowColor: theme.colors.accent,
              },
              isScrubbing && [styles.thumbScrubbing, { backgroundColor: theme.colors.accentBright }],
            ]}
          />
        </View>
      </View>

      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
          {formatDuration(activePosition)}
        </Text>
        <Text style={[styles.timeText, { color: theme.colors.textMuted, fontFamily: theme.typography.mono }]}>
          {formatDuration(safeDuration)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  touchArea: {
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  progress: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
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
    fontSize: 11,
  },
});
