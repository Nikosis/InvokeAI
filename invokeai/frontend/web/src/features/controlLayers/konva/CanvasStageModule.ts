import type { SerializableObject } from 'common/types';
import type { CanvasManager } from 'features/controlLayers/konva/CanvasManager';
import { getPrefixedId, getRectUnion } from 'features/controlLayers/konva/util';
import type { Coordinate, Dimensions, Rect } from 'features/controlLayers/store/types';
import type Konva from 'konva';
import { clamp } from 'lodash-es';
import type { Logger } from 'roarr';

export class CanvasStageModule {
  static MIN_CANVAS_SCALE = 0.1;
  static MAX_CANVAS_SCALE = 20;

  id: string;
  path: string[];
  konva: { stage: Konva.Stage };
  manager: CanvasManager;
  container: HTMLDivElement;
  log: Logger;

  constructor(stage: Konva.Stage, container: HTMLDivElement, manager: CanvasManager) {
    this.id = getPrefixedId('stage');
    this.manager = manager;
    this.path = this.manager.path.concat(this.id);
    this.log = this.manager.buildLogger(this.getLoggingContext);
    this.log.debug('Creating stage module');
    this.container = container;
    this.konva = { stage };
  }

  initialize = () => {
    this.log.debug('Initializing stage');
    this.konva.stage.container(this.container);
    const resizeObserver = new ResizeObserver(this.fitStageToContainer);
    resizeObserver.observe(this.container);
    this.fitStageToContainer();
    this.fitLayersToStage();

    return () => {
      this.log.debug('Destroying stage');
      resizeObserver.disconnect();
      this.konva.stage.destroy();
    };
  };

  fitStageToContainer = () => {
    this.log.trace('Fitting stage to container');
    this.konva.stage.width(this.konva.stage.container().offsetWidth);
    this.konva.stage.height(this.konva.stage.container().offsetHeight);
    this.manager.stateApi.$stageAttrs.set({
      x: this.konva.stage.x(),
      y: this.konva.stage.y(),
      width: this.konva.stage.width(),
      height: this.konva.stage.height(),
      scale: this.konva.stage.scaleX(),
    });
  };

  getVisibleRect = (): Rect => {
    const rects = [];

    for (const adapter of this.manager.inpaintMaskAdapters.values()) {
      if (adapter.state.isEnabled) {
        rects.push(adapter.transformer.getRelativeRect());
      }
    }

    for (const adapter of this.manager.rasterLayerAdapters.values()) {
      if (adapter.state.isEnabled) {
        rects.push(adapter.transformer.getRelativeRect());
      }
    }

    for (const adapter of this.manager.controlLayerAdapters.values()) {
      if (adapter.state.isEnabled) {
        rects.push(adapter.transformer.getRelativeRect());
      }
    }

    for (const adapter of this.manager.regionalGuidanceAdapters.values()) {
      if (adapter.state.isEnabled) {
        rects.push(adapter.transformer.getRelativeRect());
      }
    }

    const rectUnion = getRectUnion(...rects);

    if (rectUnion.width === 0 || rectUnion.height === 0) {
      // fall back to the bbox if there is no content
      return this.manager.stateApi.getBbox().rect;
    } else {
      return rectUnion;
    }
  };

  fitBboxToStage = () => {
    this.log.trace('Fitting bbox to stage');
    const bbox = this.manager.stateApi.getBbox();
    this.fitRect(bbox.rect);
  };

  fitLayersToStage() {
    this.log.trace('Fitting layers to stage');
    const rect = this.getVisibleRect();
    this.fitRect(rect);
  }

  fitRect = (rect: Rect) => {
    const { width, height } = this.getSize();

    const padding = 20; // Padding in absolute pixels

    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scale = Math.min(Math.min(availableWidth / rect.width, availableHeight / rect.height), 1);
    const x = -rect.x * scale + padding + (availableWidth - rect.width * scale) / 2;
    const y = -rect.y * scale + padding + (availableHeight - rect.height * scale) / 2;

    this.konva.stage.setAttrs({
      x,
      y,
      scaleX: scale,
      scaleY: scale,
    });

    this.manager.stateApi.$stageAttrs.set({
      ...this.manager.stateApi.$stageAttrs.get(),
      x,
      y,
      scale,
    });
  };

  /**
   * Gets the center of the stage in either absolute or relative coordinates
   * @param absolute Whether to return the center in absolute coordinates
   */
  getCenter = (absolute = false): Coordinate => {
    const scale = this.getScale();
    const { x, y } = this.getPosition();
    const { width, height } = this.getSize();

    const center = {
      x: (width / 2 - x) / scale,
      y: (height / 2 - y) / scale,
    };

    if (!absolute) {
      return center;
    }

    return this.konva.stage.getAbsoluteTransform().point(center);
  };

  /**
   * Sets the scale of the stage. If center is provided, the stage will zoom in/out on that point.
   * @param scale The new scale to set
   * @param center The center of the stage to zoom in/out on
   */
  setScale = (scale: number, center: Coordinate = this.getCenter(true)) => {
    this.log.trace('Setting scale');
    const newScale = clamp(
      Math.round(scale * 100) / 100,
      CanvasStageModule.MIN_CANVAS_SCALE,
      CanvasStageModule.MAX_CANVAS_SCALE
    );

    const { x, y } = this.getPosition();
    const oldScale = this.getScale();

    const deltaX = (center.x - x) / oldScale;
    const deltaY = (center.y - y) / oldScale;

    const newX = center.x - deltaX * newScale;
    const newY = center.y - deltaY * newScale;

    this.konva.stage.setAttrs({
      x: newX,
      y: newY,
      scaleX: newScale,
      scaleY: newScale,
    });

    this.manager.stateApi.$stageAttrs.set({
      x: Math.floor(this.konva.stage.x()),
      y: Math.floor(this.konva.stage.y()),
      width: this.konva.stage.width(),
      height: this.konva.stage.height(),
      scale: this.konva.stage.scaleX(),
    });
  };

  /**
   * Gets the scale of the stage. The stage is always scaled uniformly in x and y.
   */
  getScale = (): number => {
    // The stage is never scaled differently in x and y
    return this.konva.stage.scaleX();
  };

  /**
   * Gets the position of the stage.
   */
  getPosition = (): Coordinate => {
    return this.konva.stage.position();
  };

  /**
   * Gets the size of the stage.
   */
  getSize(): Dimensions {
    return this.konva.stage.size();
  }

  /**
   * Scales a number of pixels by the current stage scale. For example, if the stage is scaled by 5, then 10 pixels
   * would be scaled to 10px / 5 = 2 pixels.
   * @param pixels The number of pixels to scale
   * @returns The number of pixels scaled by the current stage scale
   */
  getScaledPixels = (pixels: number): number => {
    return pixels / this.getScale();
  };

  setIsDraggable = (isDraggable: boolean) => {
    this.konva.stage.draggable(isDraggable);
  };

  addLayer = (layer: Konva.Layer) => {
    this.konva.stage.add(layer);
  };

  getLoggingContext = (): SerializableObject => {
    return { ...this.manager.getLoggingContext(), path: this.path.join('.') };
  };
}
