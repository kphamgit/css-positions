import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const INTERVAL = 50;

interface Props {
  width: number;
  height: number;
}

export default function DebugGrid({ width, height }: Props) {

  const verticalLines = [];
  for (let x = 0; x <= width; x += INTERVAL) {
    verticalLines.push(
      <View key={`v-${x}`} style={[styles.verticalLine, { left: x }]}>
        <Text style={styles.labelTop}>{x}</Text>
      </View>
    );
  }

  const horizontalLines = [];
  for (let y = 0; y <= height; y += INTERVAL) {
    horizontalLines.push(
      <View key={`h-${y}`} style={[styles.horizontalLine, { top: y }]}>
        <Text style={styles.labelLeft}>{y}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {verticalLines}
      {horizontalLines}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 120, 255, 0.25)',
  },
  horizontalLine: {
    position: 'relative',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 0, 120, 0.25)',
  },
  labelTop: {
    position: 'absolute',
    top: 2,
    left: 2,
    fontSize: 10,
    color: 'rgba(1, 10, 19, 0.7)',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  labelLeft: {
    position: 'absolute',
    top: 2,
    left: 2,
    fontSize: 10,
    color: 'rgba(13, 1, 6, 0.7)',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
