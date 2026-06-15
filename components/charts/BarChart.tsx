import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { Colors, Font } from '@/constants/theme';

interface BarChartProps {
  data: number[];
  labels: string[];
  color?: string;
  highlightLast?: boolean;
  height?: number;
  width?: number;
}

export function BarChart({
  data,
  labels,
  color = Colors.primary,
  highlightLast = true,
  height = 120,
  width = 320,
}: BarChartProps) {
  const max = Math.max(...data, 1);
  const barWidth = (width - 16) / data.length - 6;
  const chartHeight = height - 24;

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((val, i) => {
          const barH = (val / max) * chartHeight;
          const x = 8 + i * ((width - 16) / data.length);
          const y = chartHeight - barH + 4;
          const isLast = highlightLast && i === data.length - 1;
          const barColor = isLast ? color : color + '55';

          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={barColor}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height}
                fontSize={9}
                fill={Colors.textMuted}
                textAnchor="middle"
              >
                {labels[i]}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
