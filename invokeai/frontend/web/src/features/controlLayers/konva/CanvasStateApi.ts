import { $alt, $ctrl, $meta, $shift } from '@invoke-ai/ui-library';
import type { Store } from '@reduxjs/toolkit';
import { logger } from 'app/logging/logger';
import type { RootState } from 'app/store/store';
import {
  $isDrawing,
  $isMouseDown,
  $lastAddedPoint,
  $lastCursorPos,
  $lastMouseDownPos,
  $lastProgressEvent,
  $shouldShowStagedImage,
  $spaceKey,
  $stageAttrs,
  bboxChanged,
  brushWidthChanged,
  caBboxChanged,
  caScaled,
  caTranslated,
  entitySelected,
  eraserWidthChanged,
  imBboxChanged,
  imBrushLineAdded,
  imEraserLineAdded,
  imImageCacheChanged,
  imRectShapeAdded,
  imScaled,
  imTranslated,
  layerBboxChanged,
  layerBrushLineAdded,
  layerEraserLineAdded,
  layerImageCacheChanged,
  layerRectShapeAdded,
  layerReset,
  layerTranslated,
  rgBboxChanged,
  rgBrushLineAdded,
  rgEraserLineAdded,
  rgImageCacheChanged,
  rgRectShapeAdded,
  rgScaled,
  rgTranslated,
  toolBufferChanged,
  toolChanged,
} from 'features/controlLayers/store/canvasV2Slice';
import type {
  BboxChangedArg,
  CanvasBrushLineState,
  CanvasEntity,
  CanvasEraserLineState,
  CanvasRectState,
  CanvasV2State,
  PositionChangedArg,
  ScaleChangedArg,
  Tool,
} from 'features/controlLayers/store/types';
import type { IRect } from 'konva/lib/types';
import type { WritableAtom } from 'nanostores';
import { atom } from 'nanostores';
import type { RgbaColor } from 'react-colorful';
import type { ImageDTO } from 'services/api/types';

const log = logger('canvas');

export class CanvasStateApi {
  private store: Store<RootState>;

  $toolState: WritableAtom<CanvasV2State['tool']>;
  $selectedEntityIdentifier: WritableAtom<CanvasV2State['selectedEntityIdentifier']>;
  $selectedEntity: WritableAtom<CanvasEntity | null>;
  $currentFill: WritableAtom<RgbaColor>;

  constructor(store: Store<RootState>) {
    this.store = store;

    this.$toolState = atom<CanvasV2State['tool']>(this.getToolState());
    this.$selectedEntityIdentifier = atom<CanvasV2State['selectedEntityIdentifier']>(
      this.getState().selectedEntityIdentifier
    );
    this.$selectedEntity = atom<CanvasEntity | null>(this.getSelectedEntity());
    this.$currentFill = atom<RgbaColor>(this.getCurrentFill());
  }

  // Reminder - use arrow functions to avoid binding issues
  getState = () => {
    return this.store.getState().canvasV2;
  };
  onEntityReset = (arg: { id: string }, entityType: CanvasEntity['type']) => {
    log.debug('onEntityReset');
    if (entityType === 'layer') {
      this.store.dispatch(layerReset(arg));
    }
  };
  onPosChanged = (arg: PositionChangedArg, entityType: CanvasEntity['type']) => {
    log.debug('onPosChanged');
    if (entityType === 'layer') {
      this.store.dispatch(layerTranslated(arg));
    } else if (entityType === 'regional_guidance') {
      this.store.dispatch(rgTranslated(arg));
    } else if (entityType === 'inpaint_mask') {
      this.store.dispatch(imTranslated(arg));
    } else if (entityType === 'control_adapter') {
      this.store.dispatch(caTranslated(arg));
    }
  };
  onScaleChanged = (arg: ScaleChangedArg, entityType: CanvasEntity['type']) => {
    log.debug('onScaleChanged');
    if (entityType === 'inpaint_mask') {
      this.store.dispatch(imScaled(arg));
    } else if (entityType === 'regional_guidance') {
      this.store.dispatch(rgScaled(arg));
    } else if (entityType === 'control_adapter') {
      this.store.dispatch(caScaled(arg));
    }
  };
  onBboxChanged = (arg: BboxChangedArg, entityType: CanvasEntity['type']) => {
    log.debug('Entity bbox changed');
    if (entityType === 'layer') {
      this.store.dispatch(layerBboxChanged(arg));
    } else if (entityType === 'control_adapter') {
      this.store.dispatch(caBboxChanged(arg));
    } else if (entityType === 'regional_guidance') {
      this.store.dispatch(rgBboxChanged(arg));
    } else if (entityType === 'inpaint_mask') {
      this.store.dispatch(imBboxChanged(arg));
    }
  };
  onBrushLineAdded = (arg: { id: string; brushLine: CanvasBrushLineState }, entityType: CanvasEntity['type']) => {
    log.debug('Brush line added');
    if (entityType === 'layer') {
      this.store.dispatch(layerBrushLineAdded(arg));
    } else if (entityType === 'regional_guidance') {
      this.store.dispatch(rgBrushLineAdded(arg));
    } else if (entityType === 'inpaint_mask') {
      this.store.dispatch(imBrushLineAdded(arg));
    }
  };
  onEraserLineAdded = (arg: { id: string; eraserLine: CanvasEraserLineState }, entityType: CanvasEntity['type']) => {
    log.debug('Eraser line added');
    if (entityType === 'layer') {
      this.store.dispatch(layerEraserLineAdded(arg));
    } else if (entityType === 'regional_guidance') {
      this.store.dispatch(rgEraserLineAdded(arg));
    } else if (entityType === 'inpaint_mask') {
      this.store.dispatch(imEraserLineAdded(arg));
    }
  };
  onRectShapeAdded = (arg: { id: string; rectShape: CanvasRectState }, entityType: CanvasEntity['type']) => {
    log.debug('Rect shape added');
    if (entityType === 'layer') {
      this.store.dispatch(layerRectShapeAdded(arg));
    } else if (entityType === 'regional_guidance') {
      this.store.dispatch(rgRectShapeAdded(arg));
    } else if (entityType === 'inpaint_mask') {
      this.store.dispatch(imRectShapeAdded(arg));
    }
  };
  onEntitySelected = (arg: { id: string; type: CanvasEntity['type'] }) => {
    log.debug('Entity selected');
    this.store.dispatch(entitySelected(arg));
  };
  onBboxTransformed = (bbox: IRect) => {
    log.debug('Generation bbox transformed');
    this.store.dispatch(bboxChanged(bbox));
  };
  onBrushWidthChanged = (width: number) => {
    log.debug('Brush width changed');
    this.store.dispatch(brushWidthChanged(width));
  };
  onEraserWidthChanged = (width: number) => {
    log.debug('Eraser width changed');
    this.store.dispatch(eraserWidthChanged(width));
  };
  onRegionMaskImageCached = (id: string, imageDTO: ImageDTO) => {
    log.debug('Region mask image cached');
    this.store.dispatch(rgImageCacheChanged({ id, imageDTO }));
  };
  onInpaintMaskImageCached = (imageDTO: ImageDTO) => {
    log.debug('Inpaint mask image cached');
    this.store.dispatch(imImageCacheChanged({ imageDTO }));
  };
  onLayerImageCached = (imageDTO: ImageDTO) => {
    log.debug('Layer image cached');
    this.store.dispatch(layerImageCacheChanged({ imageDTO }));
  };
  setTool = (tool: Tool) => {
    log.debug('Tool selection changed');
    this.store.dispatch(toolChanged(tool));
  };
  setToolBuffer = (toolBuffer: Tool | null) => {
    log.debug('Tool buffer changed');
    this.store.dispatch(toolBufferChanged(toolBuffer));
  };

  getSelectedEntity = (): CanvasEntity | null => {
    const state = this.getState();
    const identifier = state.selectedEntityIdentifier;
    if (!identifier) {
      return null;
    } else if (identifier.type === 'layer') {
      return state.layers.entities.find((i) => i.id === identifier.id) ?? null;
    } else if (identifier.type === 'control_adapter') {
      return state.controlAdapters.entities.find((i) => i.id === identifier.id) ?? null;
    } else if (identifier.type === 'ip_adapter') {
      return state.ipAdapters.entities.find((i) => i.id === identifier.id) ?? null;
    } else if (identifier.type === 'regional_guidance') {
      return state.regions.entities.find((i) => i.id === identifier.id) ?? null;
    } else if (identifier.type === 'inpaint_mask') {
      return state.inpaintMask;
    } else {
      return null;
    }
  };

  getCurrentFill = () => {
    const state = this.getState();
    const selectedEntity = this.getSelectedEntity();
    let currentFill: RgbaColor = state.tool.fill;
    if (selectedEntity) {
      if (selectedEntity.type === 'regional_guidance') {
        currentFill = { ...selectedEntity.fill, a: state.settings.maskOpacity };
      } else if (selectedEntity.type === 'inpaint_mask') {
        currentFill = { ...state.inpaintMask.fill, a: state.settings.maskOpacity };
      }
    } else {
      currentFill = state.tool.fill;
    }
    return currentFill;
  };
  getBbox = () => {
    return this.getState().bbox;
  };
  getToolState = () => {
    return this.getState().tool;
  };
  getSettings = () => {
    return this.getState().settings;
  };
  getRegionsState = () => {
    return this.getState().regions;
  };
  getLayersState = () => {
    return this.getState().layers;
  };
  getControlAdaptersState = () => {
    return this.getState().controlAdapters;
  };
  getInpaintMaskState = () => {
    return this.getState().inpaintMask;
  };
  getInitialImageState = () => {
    return this.getState().initialImage;
  };
  getMaskOpacity = () => {
    return this.getState().settings.maskOpacity;
  };
  getSession = () => {
    return this.getState().session;
  };
  getIsSelected = (id: string) => {
    return this.getSelectedEntity()?.id === id;
  };
  getLogLevel = () => {
    return this.store.getState().system.consoleLogLevel;
  };

  // Read-write state, ephemeral interaction state
  $isDrawing = $isDrawing;
  $isMouseDown = $isMouseDown;
  $lastAddedPoint = $lastAddedPoint;
  $lastMouseDownPos = $lastMouseDownPos;
  $lastCursorPos = $lastCursorPos;
  $lastProgressEvent = $lastProgressEvent;
  $spaceKey = $spaceKey;
  $altKey = $alt;
  $ctrlKey = $ctrl;
  $metaKey = $meta;
  $shiftKey = $shift;
  $shouldShowStagedImage = $shouldShowStagedImage;
  $stageAttrs = $stageAttrs;
}
