declare module '@16bitink/inkfish/build-id' {
  /** A hash of InkFish's source, defined as __INKFISH_BUILD__ by every build that bundles it. */
  export function inkfishBuildId(): string;
}
