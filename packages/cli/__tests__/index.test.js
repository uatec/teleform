const { applyTerraform, detachTerraform } = require('../terraform');

describe('Terraform', () => {
  test('applyTerraform should be a function', () => {
    expect(typeof applyTerraform).toBe('function');
  });

  test('detachTerraform should be a function', () => {
    expect(typeof detachTerraform).toBe('function');
  });
});