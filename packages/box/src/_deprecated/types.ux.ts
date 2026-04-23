export type BoxTreeUxStyleQueryLike = {
  nouns: string[];
  states: string[];
};

export type BoxTreeUxStyleManagerLike = {
  match: (query: BoxTreeUxStyleQueryLike) => unknown;
};

export type BoxTreeFillStyle = {
  color?: number;
  alpha?: number;
};

export type BoxTreeStrokeStyle = {
  color?: number;
  alpha?: number;
  width?: number;
};

export type BoxTreeStyleMap = {
  fill: BoxTreeFillStyle;
  stroke: BoxTreeStrokeStyle;
};
