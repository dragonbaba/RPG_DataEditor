/**
 * Property Editor Module
 * 属性编辑器模块导出
 */

export { 
  initPropertyPanel, 
  renderPropertyPanel, 
  addCustomAttribute, 
  collectBaseParams, 
  collectCustomParams, 
  disposePropertyPanel 
} from '../../panels/PropertyPanel';

export default {
  init: () => import('../../panels/PropertyPanel').then(m => m.initPropertyPanel()),
  render: () => import('../../panels/PropertyPanel').then(m => m.renderPropertyPanel()),
  dispose: () => import('../../panels/PropertyPanel').then(m => m.disposePropertyPanel()),
};