import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node } from 'reactflow';
import { SearchControls } from './SearchControls';

interface NodeInspectorProps {
  selectedNode: Node | null;
  nodeRegistry: Map<string, any>;
  connectionValues: Record<string, any>;
  onClose: () => void;
  onSearchById: (handleId: string) => void;
  onTypeFilter: (selectedTypes: string[]) => void;
  availableNodeTypes: string[];
  isLoading: boolean;
}

interface PropertyDisplayProps {
  propertyKey: string;
  propertyValue: any;
  isConnection: boolean;
  connectedValue?: any;
  connectedNodeId?: string;
  nodeRegistry: Map<string, any>;
  depth?: number;
  parentPath?: string;
}

function PropertyDisplay({ 
  propertyKey, 
  propertyValue, 
  isConnection, 
  connectedValue, 
  connectedNodeId,
  nodeRegistry,
  parentPath = ''
}: PropertyDisplayProps) {
  const currentPath = parentPath ? `${parentPath}.${propertyKey}` : propertyKey;
  const [collapsedArrays, setCollapsedArrays] = useState<Set<string>>(new Set());

  const toggleArrayCollapse = useCallback((path: string) => {
    setCollapsedArrays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "null";
    }
    
    if (typeof value === 'object') {
      // Handle special value objects - extract $value if present
      if (value.$value !== undefined) {
        return String(value.$value);
      }
      
      // For objects without $value, show a simplified representation
      if (Array.isArray(value)) {
        return `[Array with ${value.length} items]`;
      }
      
      // For objects, show a count of meaningful properties
      const meaningfulKeys = Object.keys(value).filter(key => !key.startsWith('$') && key !== 'HandleId');
      if (meaningfulKeys.length === 0) {
        return "[Empty Object]";
      }
      
      return `[Object with ${meaningfulKeys.length} properties]`;
    }
    
    return String(value);
  };

  const shouldShowProperty = (key: string): boolean => {
    // Skip internal properties
    if (key.startsWith('$')) {
      return false;
    }
    
    // Skip properties that are purely structural/internal
    if (key === 'HandleId' || key === 'id') {
      return false;
    }
    
    return true;
  };

  const isNestedObject = (value: any): boolean => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    
    // Don't treat connection objects as nested objects
    if (value.HandleRefId || value.HandleId || (value.node && (value.node.HandleRefId || value.node.HandleId))) {
      return false;
    }
    
    // Check if it has meaningful nested properties (excluding $type and other internal props)
    const meaningfulKeys = Object.keys(value).filter(shouldShowProperty);
    return meaningfulKeys.length > 0;
  };

  const isNestedArray = (value: any): boolean => {
    return Array.isArray(value) && value.length > 0;
  };

  const getConnectedNodeInfo = (nodeId: string) => {
    const nodeData = nodeRegistry.get(nodeId);
    if (!nodeData) return { name: 'Unknown Node', type: 'Unknown' };
    
    const nodeType = nodeData.$type ? nodeData.$type.replace('animAnimNode_', '') : 'Unknown';
    
    // Try to get a meaningful name for the node
    let nodeName = nodeType;
    
    // For State nodes, use the state name
    if (nodeData.name) {
      const name = nodeData.name.$value || nodeData.name;
      if (name && name !== 'None') {
        nodeName = `${nodeType}: ${name}`;
      }
    }
    
    // For animation nodes, use the animation name
    if (nodeData.animation) {
      const animName = nodeData.animation.$value || nodeData.animation;
      if (animName && animName !== 'None') {
        nodeName = `${nodeType}: ${animName}`;
      }
    }
    
    return { name: nodeName, type: nodeType };
  };

  const renderNestedProperties = (obj: any, parentKey: string, currentDepth: number, basePath: string = '') => {
    if (currentDepth > 5) {
      // Prevent infinite recursion
      return <span className="nested-direct-value">[Max depth reached]</span>;
    }

    if (isNestedArray(obj)) {
      const arrayPath = basePath ? `${basePath}.${parentKey}` : parentKey;
      const isCollapsed = collapsedArrays.has(arrayPath);
      
      return (
        <div className="nested-array" style={{ marginLeft: `${Math.min(currentDepth * 15, 60)}px` }}>
          <div className="array-header">
            <button 
              className="array-collapse-button"
              onClick={() => toggleArrayCollapse(arrayPath)}
              title={isCollapsed ? 'Expand array' : 'Collapse array'}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
            <span className="array-info">Array ({obj.length} items)</span>
          </div>
          {!isCollapsed && obj.map((item: any, index: number) => {
            // For primitive values in arrays
            if (typeof item !== 'object' || item === null) {
              return (
                <div key={`${parentKey}-${index}`} className="nested-property-item">
                  <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                    [{index}]:
                  </div>
                  <div className="nested-property-value">
                    <span className="nested-direct-value">{formatValue(item)}</span>
                  </div>
                </div>
              );
            }

            // For objects in arrays
            const hasNestedProps = Object.keys(item).filter(shouldShowProperty).length > 0;
            
            if (hasNestedProps) {
              return (
                <div key={`${parentKey}-${index}`} className="nested-array-item">
                  <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                    [{index}]:
                  </div>
                  <div className="nested-property-value">
                    {renderNestedProperties(item, `${parentKey}-${index}`, currentDepth + 1, arrayPath)}
                  </div>
                </div>
              );
            } else {
              // Object with no meaningful properties, show its $value if available
              const displayValue = item.$value !== undefined ? item.$value : formatValue(item);
              return (
                <div key={`${parentKey}-${index}`} className="nested-property-item">
                  <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                    [{index}]:
                  </div>
                  <div className="nested-property-value">
                    <span className="nested-direct-value">{displayValue}</span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      );
    }

    // Handle objects
    const properties = [];
    
    for (const [key, value] of Object.entries(obj)) {
      if (shouldShowProperty(key)) {
        properties.push({ key, value });
      }
    }
    
    if (properties.length === 0) {
      // If no meaningful properties, try to show $value
      if (obj.$value !== undefined) {
        return <span className="nested-direct-value">{String(obj.$value)}</span>;
      }
      return <span className="nested-direct-value">[No displayable properties]</span>;
    }
    
    return (
      <div className="nested-properties" style={{ marginLeft: `${Math.min(currentDepth * 15, 60)}px` }}>
        {properties.map(({ key, value }, index) => {
          // Check if this value needs further nesting
          const needsNesting = (isNestedObject(value) || isNestedArray(value)) && 
                              !(typeof value === 'object' && value !== null && '$value' in value && 
                                Object.keys(value as Record<string, any>).filter(shouldShowProperty).length <= 1);
          
          return (
            <div key={`${parentKey}-${key}-${index}`} className="nested-property-item">
              <div className="nested-property-key" style={{ paddingLeft: `${Math.min(currentDepth * 10, 40)}px` }}>
                {key}:
              </div>
              <div className="nested-property-value">
                {needsNesting ? (
                  <div className="nested-object">
                    {renderNestedProperties(value, `${parentKey}-${key}`, currentDepth + 1, basePath)}
                  </div>
                ) : (
                  <span className="nested-direct-value">{formatValue(value)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const isNestedObj = !isConnection && (isNestedObject(propertyValue) || isNestedArray(propertyValue));

  return (
    <div className={`property-item ${isConnection ? 'connected' : ''} ${isNestedObj ? 'has-nested' : ''}`}>
      <div className="property-key">{propertyKey}:</div>
      <div className={`property-value ${isConnection ? 'connected-value' : ''}`}>
        {isConnection && connectedValue && connectedNodeId && (
          <div className="connection-info">
            <span className="connected-label">Connected to:</span>
            <div className="connected-data">
              <div className="connected-node-name">{getConnectedNodeInfo(connectedNodeId).name}</div>
              <div className="connected-node-value">
                {connectedValue.value ? `Value: ${connectedValue.value}` : `Type: ${connectedValue.type || 'unknown'}`}
              </div>
            </div>
          </div>
        )}
        {isConnection && !connectedValue && (
          <div className="connection-info">
            <span className="unconnected-label">Socket (no connection)</span>
          </div>
        )}
        {!isConnection && !isNestedObj && (
          <span className="direct-value">{formatValue(propertyValue)}</span>
        )}
        {!isConnection && isNestedObj && (
          <div className="nested-container">
            {renderNestedProperties(propertyValue, propertyKey, 0, currentPath)}
          </div>
        )}
      </div>
    </div>
  );
}

export function NodeInspector({ 
  selectedNode, 
  nodeRegistry,
  connectionValues,
  onClose,
  onSearchById,
  onTypeFilter,
  availableNodeTypes,
  isLoading
}: NodeInspectorProps) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const inspectorRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start dragging if clicking on the header itself, not the buttons
    const target = e.target as HTMLElement;
    if (target.classList.contains('collapse-button') || 
        target.classList.contains('close-button') ||
        target.closest('.collapse-button') ||
        target.closest('.close-button')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    const rect = inspectorRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep inspector within viewport bounds
    const maxX = window.innerWidth - 300; // min width of inspector
    const maxY = window.innerHeight - 200; // min height of inspector
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!selectedNode) {
    return (
      <div 
        ref={inspectorRef}
        className={`node-inspector floating ${isCollapsed ? 'collapsed' : ''}`}
        style={{ 
          left: position.x, 
          top: position.y
        }}
      >
        <div 
          className="inspector-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h3>Node Inspector</h3>
          <div className="inspector-controls">
            <button 
              className="collapse-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▲' : '▼'}
            </button>
            <button 
              className="close-button" 
              onClick={onClose}
              title="Close Inspector"
            >
              ×
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="inspector-content">
            <div className="inspector-search-section">
              <SearchControls
                onSearchById={onSearchById}
                onTypeFilter={onTypeFilter}
                availableNodeTypes={availableNodeTypes}
                isLoading={isLoading}
              />
            </div>
            
            <div className="no-selection">
              <p>Select a node to view its properties</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const nodeData = nodeRegistry.get(selectedNode.id);
  
  if (!nodeData) {
    return (
      <div 
        ref={inspectorRef}
        className={`node-inspector floating ${isCollapsed ? 'collapsed' : ''}`}
        style={{ 
          left: position.x, 
          top: position.y
        }}
      >
        <div 
          className="inspector-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <h3>Node Inspector</h3>
          <div className="inspector-controls">
            <button 
              className="collapse-button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▲' : '▼'}
            </button>
            <button 
              className="close-button" 
              onClick={onClose}
              title="Close Inspector"
            >
              ×
            </button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="inspector-content">
            <div className="inspector-search-section">
              <SearchControls
                onSearchById={onSearchById}
                onTypeFilter={onTypeFilter}
                availableNodeTypes={availableNodeTypes}
                isLoading={isLoading}
              />
            </div>
            
            <div className="error">
              <p>Node data not found</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const getConnectedValue = (propertyName: string): any => {
    const connectionKey = `${selectedNode.id}-${propertyName}`;
    return connectionValues[connectionKey];
  };

  const getConnectedNodeId = (_propertyName: string, value: any): string | null => {
    // Extract the connected node ID from the property value
    if (value && typeof value === 'object' && value !== null) {
      if (value.HandleRefId) {
        return value.HandleRefId;
      }
      if (value.HandleId) {
        return value.HandleId;
      }
      if (value.node && (value.node.HandleRefId || value.node.HandleId)) {
        return value.node.HandleRefId || value.node.HandleId;
      }
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object' && firstItem !== null) {
          return firstItem.HandleRefId || firstItem.HandleId || 
                 (firstItem.node && typeof firstItem.node === 'object' && firstItem.node !== null && 
                  (firstItem.node.HandleRefId || firstItem.node.HandleId));
        }
      }
    }
    return null;
  };

  const isConnectionProperty = (_propertyName: string, value: any): boolean => {
    // Check if this property represents a connection to another node
    if (value && typeof value === 'object') {
      if (value.HandleRefId || value.HandleId) {
        return true;
      }
      if (value.node && typeof value.node === 'object') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.some(item => 
          item && typeof item === 'object' && (item.HandleRefId || item.HandleId)
        );
      }
    }
    return false;
  };

  const shouldShowProperty = (key: string, _value: any): boolean => {
    // Skip internal properties
    if (key.startsWith('$')) {
      return false;
    }
    
    // Skip properties that are purely structural/internal
    if (key === 'HandleId' || key === 'id') {
      return false;
    }
    
    return true;
  };

  const renderProperties = (nodeData: any) => {
    if (!nodeData || typeof nodeData !== 'object') {
      return <div className="no-properties">No properties available</div>;
    }

    const properties = [];
    for (const [key, value] of Object.entries(nodeData)) {
      if (shouldShowProperty(key, value)) {
        properties.push({ key, value });
      }
    }

    if (properties.length === 0) {
      return <div className="no-properties">No properties available</div>;
    }

    return (
      <div className="properties-list">
        {properties.map(({ key, value }, index) => {
          const isConnection = isConnectionProperty(key, value);
          const connectedValue = isConnection ? getConnectedValue(key) : null;
          const connectedNodeId = isConnection ? getConnectedNodeId(key, value) : null;
          
          return (
            <PropertyDisplay
              key={index}
              propertyKey={key}
              propertyValue={value}
              isConnection={isConnection}
              connectedValue={connectedValue}
              connectedNodeId={connectedNodeId || undefined}
              nodeRegistry={nodeRegistry}
              parentPath={selectedNode.id}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div 
      ref={inspectorRef}
      className={`node-inspector floating ${isCollapsed ? 'collapsed' : ''}`}
      style={{ 
        left: position.x, 
        top: position.y
      }}
    >
      <div 
        className="inspector-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <h3>Node Inspector</h3>
        <div className="inspector-controls">
          <button 
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <button 
            className="close-button" 
            onClick={onClose}
            title="Close Inspector"
          >
            ×
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="inspector-content">
          <div className="inspector-search-section">
            <SearchControls
              onSearchById={onSearchById}
              onTypeFilter={onTypeFilter}
              availableNodeTypes={availableNodeTypes}
              isLoading={isLoading}
            />
          </div>
          
          <div className="node-info">
            <div className="info-row">
              <span className="info-label">ID:</span>
              <span className="info-value">{selectedNode.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Type:</span>
              <span className="info-value">{selectedNode.data.nodeType}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Label:</span>
              <span className="info-value">{selectedNode.data.label}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Position:</span>
              <span className="info-value">
                ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Input Sockets:</span>
              <span className="info-value">{selectedNode.data.inputSockets.length}</span>
            </div>
          </div>

          <div className="node-properties">
            <h4>Properties</h4>
            {renderProperties(nodeData)}
          </div>
        </div>
      )}
    </div>
  );
}