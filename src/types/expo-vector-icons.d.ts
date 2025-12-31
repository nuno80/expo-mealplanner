declare module "@expo/vector-icons/Ionicons" {
  import type { IconProps } from "@expo/vector-icons/build/createIconSet";
  import type { ComponentType } from "react";
  const Ionicons: ComponentType<IconProps<string>>;
  export default Ionicons;
}

declare module "@expo/vector-icons" {
  export * from "@expo/vector-icons/build/Icons";
}
