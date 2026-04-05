import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('connects error text via aria-describedby', () => {
    render(<Input label="Name" error="Required" />);

    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('aria-describedby');

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    // error message should be present in DOM
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});
