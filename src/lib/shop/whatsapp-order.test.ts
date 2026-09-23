import { describe, expect, it } from 'vitest';
import { orderMessage } from './place';
import { whatsappFromAnswers } from '@/lib/generation/interview';

const order = {
  reference: 'ACD-KMN',
  customer: {
    name: 'Vivek Borkar',
    contact: '+91 98765 43210',
    address: '12 Hill Road, Bandra West',
    city: 'Akola',
    postcode: '444001',
    note: 'Please call before delivery',
  },
  lines: [
    { title: 'Cotton kurta', quantity: 2, linePaise: 99800 },
    { title: 'Steel bottle', quantity: 1, linePaise: 129900 },
  ],
  shippingLabel: 'Standard delivery',
  shippingPaise: 5000,
  totalPaise: 234700,
};

describe('orderMessage', () => {
  it('leads with the reference the customer was given', () => {
    expect(orderMessage(order).split('\n')[0]).toContain('ACD-KMN');
  });

  it('lists what was ordered, with quantities and money', () => {
    const message = orderMessage(order);
    expect(message).toContain('Cotton kurta × 2');
    expect(message).toContain('₹998');
    expect(message).toContain('Total: ₹2,347');
  });

  /** The owner must be able to act on it without opening anything else. */
  it('carries the address and a phone number to ring', () => {
    const message = orderMessage(order);
    expect(message).toContain('12 Hill Road');
    expect(message).toContain('Akola');
    expect(message).toContain('444001');
    expect(message).toContain('98765 43210');
    expect(message).toContain('Please call before delivery');
  });

  it('says free delivery rather than ₹0', () => {
    expect(orderMessage({ ...order, shippingPaise: 0 })).toContain('Standard delivery: Free');
  });

  it('leaves out what it does not have rather than printing empty labels', () => {
    const bare = orderMessage({
      ...order,
      customer: { name: '', contact: '', address: '', city: '', postcode: '', note: '' },
      shippingLabel: null,
    });
    expect(bare).not.toContain('Name:');
    expect(bare).not.toContain('Deliver to:');
    expect(bare).not.toContain('Note:');
    expect(bare).toContain('Total:');
  });
});

describe('whatsappFromAnswers', () => {
  it('finds the number by the id it asked for', () => {
    expect(
      whatsappFromAnswers([{ id: 'whatsapp', question: 'Your WhatsApp number?', answer: '9876543210' }]),
    ).toBe('9876543210');
  });

  /** The model writes the questions and does not always use the id given. */
  it('finds it by the wording when the id is something else', () => {
    expect(
      whatsappFromAnswers([{ id: 'contact', question: 'What is your WhatsApp number?', answer: '+91 98765 43210' }]),
    ).toBe('+91 98765 43210');
  });

  it('ignores an answer that is not a number', () => {
    expect(whatsappFromAnswers([{ id: 'whatsapp', question: 'WhatsApp?', answer: 'later' }])).toBeNull();
    expect(whatsappFromAnswers([{ id: 'whatsapp', question: 'WhatsApp?', answer: '' }])).toBeNull();
    expect(whatsappFromAnswers([{ id: 'whatsapp', question: 'WhatsApp?', answer: '12345' }])).toBeNull();
  });

  it('is not fooled by an unrelated question', () => {
    expect(
      whatsappFromAnswers([{ id: 'name', question: 'Business name?', answer: '9876543210' }]),
    ).toBeNull();
  });

  it('copes with no answers at all', () => {
    expect(whatsappFromAnswers([])).toBeNull();
  });
});
