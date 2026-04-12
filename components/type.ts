import { SharedValue } from "react-native-reanimated";

type SharedValues<T extends Record<string, string | number | boolean>> = {
    [K in keyof T]: SharedValue<T[K]>;
  };
  
export type Offset = SharedValues<{
    order: number;
    height: number;
    width: number;
    x: number;
    y: number;
    originalX: number;
    originalY: number;
  }>;