import { Injectable } from '@nestjs/common';

interface IKeyFolderStructure {
  [key: string]: any;
}

interface IComponentStructure {
  [key: string]: any;
}

@Injectable()
export class KeyHelperService {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  buildHierarchy(data, rootId) {
    const map = new Map();

    data.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    const result = [];

    data.forEach((item) => {
      if (item.parentId === rootId) {
        result.push(map.get(item.id));
      } else {
        const parent = map.get(item.parentId);

        if (parent) {
          parent.children.push(map.get(item.id));
        }
      }
    });

    return result;
  }

  buildHierarchyForJsonExport(
    keysDataArray,
    valuesDataTree,
    rootId,
    languageId,
  ): {
    localesData: IKeyFolderStructure;
    componentsData: IComponentStructure;
  } {
    const map = new Map();

    keysDataArray.forEach((item) => {
      map.set(item.id, { ...item, children: {} });
    });

    const result: {
      localesData: IKeyFolderStructure;
      componentsData: IComponentStructure;
    } = {
      localesData: {},
      componentsData: {},
    };

    keysDataArray.forEach((item) => {
      if (item.parentId === rootId) {
        const key = map.get(item.id);

        if (item.type === 'string') {
          const { value = '' } = valuesDataTree[key.id] && valuesDataTree[key.id][languageId] ? valuesDataTree[key.id][languageId] : {};

          result.localesData[key.label] = value;
        }

        if (item.type === 'folder') {
          result.localesData[key.label] = key.children;
        }

        if (item.type === 'component') {
          result.componentsData[key.label] = key.children;
        }
      } else {
        const parent = map.get(item.parentId);

        if (parent) {
          const key = map.get(item.id);

          if (item.type === 'string') {
            const { value = '' } = valuesDataTree[key.id] && valuesDataTree[key.id][languageId] ? valuesDataTree[key.id][languageId] : {};

            parent.children[key.label] = value;
          }

          if (item.type === 'folder') {
            parent.children[key.label] = key.children;
          }
        }
      }
    });

    return result;
  }

  buildHierarchyForXmlExport(
    keysDataArray,
    valuesDataTree,
    rootId,
    languageId,
  ): {
    localesData: IKeyFolderStructure;
    componentsData: IComponentStructure;
  } {
    const keysDataMap = new Map();

    keysDataArray.forEach((item) => {
      keysDataMap.set(item.id, { ...item, children: {} });
    });

    const result: {
      localesData: IKeyFolderStructure;
      componentsData: IComponentStructure;
    } = {
      localesData: {},
      componentsData: {},
    };

    keysDataArray.forEach((item) => {
      if (item.parentId === rootId) {
        const key = keysDataMap.get(item.id);

        const xmlReadyLabel = key.label.toLowerCase().replaceAll(' ', '-');

        if (item.type === 'string') {
          const { value = '' } = valuesDataTree[key.id] && valuesDataTree[key.id][languageId] ? valuesDataTree[key.id][languageId] : {};

          result.localesData[xmlReadyLabel] = {
            _text: value,
          };
        }

        if (item.type === 'folder') {
          result.localesData[xmlReadyLabel] = key.children;
        }

        if (item.type === 'component') {
          result.componentsData[xmlReadyLabel] = key.children;
        }
      } else {
        const parent = keysDataMap.get(item.parentId);

        if (parent) {
          const key = keysDataMap.get(item.id);

          const xmlReadyLabel = key.label.toLowerCase().replaceAll(' ', '-');

          if (item.type === 'string') {
            const { value = '' } = valuesDataTree[key.id] && valuesDataTree[key.id][languageId] ? valuesDataTree[key.id][languageId] : {};

            parent.children[xmlReadyLabel] = {
              _text: value,
            };
          }

          if (item.type === 'folder') {
            parent.children[xmlReadyLabel] = key.children;
          }
        }
      }
    });

    return result;
  }

  buildLinearKeyValueArray(
    keysDataArray,
    valuesDataTree,
    rootId,
    languageId,
  ): {
    localesData: IKeyFolderStructure;
    componentsData: IComponentStructure;
  } {
    const keysDataMap = new Map();

    keysDataArray.forEach((item) => {
      keysDataMap.set(item.id, { ...item, children: {} });
    });

    const result: {
      localesData: { [key: string]: string }[];
      componentsData: { [key: string]: object[] };
    } = {
      localesData: [],
      componentsData: {},
    };

    keysDataArray.forEach((keysDataItem) => {
      const { id: keyId, label, pathCache, type } = keysDataItem;

      if (type !== 'string') {
        return;
      }

      const { value = '' } = valuesDataTree[keyId] && valuesDataTree[keyId][languageId] ? valuesDataTree[keyId][languageId] : {};

      const pathCacheArray = pathCache.split('/');

      let keyIsComponentsChild = false;

      const firstParentData = keysDataMap.get(pathCacheArray[1]);

      if (pathCacheArray.length >= 2) {
        keyIsComponentsChild = firstParentData.type === 'component';
      }

      const labelArray = [];

      pathCacheArray.forEach((pathCacheItem) => {
        if (!keysDataMap.has(pathCacheItem)) {
          return;
        }

        const { label, type } = keysDataMap.get(pathCacheItem);

        if (type === 'component') {
          return;
        }

        labelArray.push(label);
      });

      labelArray.push(label);

      if (keyIsComponentsChild) {
        if (!result.componentsData[firstParentData.label]) {
          result.componentsData[firstParentData.label] = [];
        }

        result.componentsData[firstParentData.label].push({
          key: labelArray.join('.'),
          value,
        });
      } else {
        result.localesData.push({
          key: labelArray.join('.'),
          value,
        });
      }
    });

    return result;
  }

  buildLinearArrayForXml(
    keysDataArray,
    valuesDataTree,
    rootId,
    languageId,
  ): {
    localesData: IKeyFolderStructure;
    componentsData: IComponentStructure;
  } {
    const keysDataMap = new Map();

    keysDataArray.forEach((item) => {
      keysDataMap.set(item.id, { ...item, children: {} });
    });

    const result: {
      localesData: any[];
      componentsData: { [key: string]: object[] };
    } = {
      localesData: [],
      componentsData: {},
    };

    keysDataArray.forEach((keysDataItem) => {
      const { id: keyId, label, pathCache, type } = keysDataItem;

      if (type !== 'string') {
        return;
      }

      const { value = '' } = valuesDataTree[keyId] && valuesDataTree[keyId][languageId] ? valuesDataTree[keyId][languageId] : {};

      const pathCacheArray = pathCache.split('/');

      let keyIsComponentsChild = false;

      const firstParentData = keysDataMap.get(pathCacheArray[1]);

      if (pathCacheArray.length >= 2) {
        keyIsComponentsChild = firstParentData.type === 'component';
      }

      const labelArray = [];

      pathCacheArray.forEach((pathCacheItem) => {
        if (!keysDataMap.has(pathCacheItem)) {
          return;
        }

        const { label, type } = keysDataMap.get(pathCacheItem);

        if (type === 'component') {
          return;
        }

        labelArray.push(label);
      });

      labelArray.push(label);

      if (keyIsComponentsChild) {
        if (!result.componentsData[firstParentData.label]) {
          result.componentsData[firstParentData.label] = [];
        }

        result.componentsData[firstParentData.label].push({
          type: 'element',
          name: 'string',
          attributes: {
            name: labelArray.join('.'),
          },
          elements: [
            {
              type: 'text',
              text: value,
            },
          ],
        });
      } else {
        result.localesData.push({
          type: 'element',
          name: 'string',
          attributes: {
            name: labelArray.join('.'),
          },
          elements: [
            {
              type: 'text',
              text: value,
            },
          ],
        });
      }
    });

    return result;
  }
}
