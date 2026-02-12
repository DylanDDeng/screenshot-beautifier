export type AnnotationTool =
  | "arrow"
  | "text"
  | "rectangle"
  | "ellipse"
  | "highlight"
  | "blur"
  | "line"
  | "number";

export interface AnnotationBase {
  id: string;
  tool: AnnotationTool;
  x: number;
  y: number;
  color: string;
  strokeWidth: number;
}

export interface ArrowAnnotation extends AnnotationBase {
  tool: "arrow";
  endX: number;
  endY: number;
}

export interface TextAnnotation extends AnnotationBase {
  tool: "text";
  text: string;
  fontSize: number;
}

export interface RectAnnotation extends AnnotationBase {
  tool: "rectangle";
  width: number;
  height: number;
  fill?: string;
}

export interface EllipseAnnotation extends AnnotationBase {
  tool: "ellipse";
  radiusX: number;
  radiusY: number;
}

export interface HighlightAnnotation extends AnnotationBase {
  tool: "highlight";
  width: number;
  height: number;
}

export interface BlurAnnotation extends AnnotationBase {
  tool: "blur";
  width: number;
  height: number;
  intensity: number;
}

export interface LineAnnotation extends AnnotationBase {
  tool: "line";
  endX: number;
  endY: number;
}

export interface NumberAnnotation extends AnnotationBase {
  tool: "number";
  number: number;
  radius: number;
}

export type Annotation =
  | ArrowAnnotation
  | TextAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | HighlightAnnotation
  | BlurAnnotation
  | LineAnnotation
  | NumberAnnotation;
