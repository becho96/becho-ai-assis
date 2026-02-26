#!/usr/bin/env node

/**
 * Validation script for n8n workflows
 * Checks that all workflows have correct structure and required fields
 */

const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '../n8n-workflows');
const REQUIRED_NODE_FIELDS = ['parameters', 'id', 'name', 'type', 'typeVersion', 'position', 'disabled'];
const WORKFLOW_FILES = [
  'telegram-router.json',
  'reminder-checker.json',
  'notion-sync.json',
  'morning-digest.json',
  'evening-digest.json'
];

let hasErrors = false;

function validateNode(node, workflowName, nodeIndex) {
  const errors = [];
  
  // Check required fields
  REQUIRED_NODE_FIELDS.forEach(field => {
    if (!(field in node)) {
      errors.push(`Node ${nodeIndex} missing required field: ${field}`);
    }
  });
  
  // Check parameters is not empty
  if (node.parameters && Object.keys(node.parameters).length === 0) {
    errors.push(`Node ${nodeIndex} (${node.name || 'unnamed'}) has empty parameters`);
  }
  
  // Check typeVersion is number
  if (node.typeVersion && typeof node.typeVersion !== 'number') {
    errors.push(`Node ${nodeIndex} (${node.name || 'unnamed'}) typeVersion should be number`);
  }
  
  // Check position is array with 2 numbers
  if (node.position) {
    if (!Array.isArray(node.position) || node.position.length !== 2) {
      errors.push(`Node ${nodeIndex} (${node.name || 'unnamed'}) position should be array of 2 numbers`);
    }
  }
  
  // Check disabled is boolean
  if (node.disabled !== undefined && typeof node.disabled !== 'boolean') {
    errors.push(`Node ${nodeIndex} (${node.name || 'unnamed'}) disabled should be boolean`);
  }
  
  return errors;
}

function validateWorkflow(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n🔍 Validating ${fileName}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const workflow = JSON.parse(content);
    
    // Check required workflow fields
    if (!workflow.name) {
      console.error(`  ❌ Missing workflow name`);
      hasErrors = true;
      return;
    }
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      console.error(`  ❌ Missing or invalid nodes array`);
      hasErrors = true;
      return;
    }
    
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      console.error(`  ❌ Missing or invalid connections object`);
      hasErrors = true;
      return;
    }
    
    // Validate each node
    let nodeErrors = 0;
    workflow.nodes.forEach((node, index) => {
      const errors = validateNode(node, workflow.name, index);
      if (errors.length > 0) {
        errors.forEach(err => {
          console.error(`  ❌ ${err}`);
          nodeErrors++;
          hasErrors = true;
        });
      }
    });
    
    // Validate connections
    const nodeNames = workflow.nodes.map(n => n.name);
    Object.keys(workflow.connections).forEach(sourceName => {
      if (!nodeNames.includes(sourceName)) {
        console.error(`  ❌ Connection source "${sourceName}" not found in nodes`);
        hasErrors = true;
      }
      
      const outputs = workflow.connections[sourceName];
      if (outputs.main) {
        outputs.main.forEach((outputArray, outputIndex) => {
          if (Array.isArray(outputArray)) {
            outputArray.forEach(connection => {
              if (!nodeNames.includes(connection.node)) {
                console.error(`  ❌ Connection target "${connection.node}" not found in nodes`);
                hasErrors = true;
              }
            });
          }
        });
      }
    });
    
    if (nodeErrors === 0) {
      console.log(`  ✅ All ${workflow.nodes.length} nodes are valid`);
      console.log(`  ✅ All connections are valid`);
    }
    
  } catch (error) {
    console.error(`  ❌ Error reading/parsing workflow: ${error.message}`);
    hasErrors = true;
  }
}

// Main execution
console.log('🚀 n8n Workflow Validation\n');
console.log(`Workflows directory: ${WORKFLOWS_DIR}`);

WORKFLOW_FILES.forEach(file => {
  const filePath = path.join(WORKFLOWS_DIR, file);
  if (fs.existsSync(filePath)) {
    validateWorkflow(filePath);
  } else {
    console.error(`\n❌ File not found: ${file}`);
    hasErrors = true;
  }
});

console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Validation failed! Please fix the errors above.');
  process.exit(1);
} else {
  console.log('✅ All workflows are valid!');
  process.exit(0);
}
