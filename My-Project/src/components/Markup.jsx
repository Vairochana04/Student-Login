import React from 'react';
import parse, { attributesToProps } from 'html-react-parser';
import { logoFallback } from '../portal.js';

// Convert the retained, escaped portal templates into React elements.
// Uncontrolled form fields keep the original document-level validation handlers.
export default function Markup({ html, content }) {
  const options = { replace(node) {
    if (node.name === 'portal-content') return content || <></>;
    if (node.name === 'img' && node.attribs?.onerror) {
      const { onerror, ...attrs } = node.attribs;
      return <img {...attributesToProps(attrs)} onError={e => logoFallback(e.currentTarget)} />;
    }
    if (node.name === 'input' && Object.hasOwn(node.attribs || {}, 'value')) {
      const props = attributesToProps(node.attribs);
      const value = props.value; delete props.value;
      return <input {...props} defaultValue={value} />;
    }
    if (node.name === 'textarea') {
      return <textarea {...attributesToProps(node.attribs)} defaultValue={node.children.map(n => n.data || '').join('')} />;
    }
  }};
  return <>{parse(html, options)}</>;
}
