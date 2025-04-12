"use client";

import React, { useState } from 'react';

interface Order {
  id: number;
  status: 'PENDING' | 'COMPLETE';
  // Add type later for VIP orders
}

export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);

  const addNormalOrder = () => {
    const newOrder: Order = {
      id: nextOrderId,
      status: 'PENDING',
    };
    setOrders(prevOrders => [...prevOrders, newOrder]);
    setNextOrderId(prevId => prevId + 1);
  };

  const pendingOrders = orders.filter(order => order.status === 'PENDING');
  const completeOrders = orders.filter(order => order.status === 'COMPLETE');

  return (
    <div className="container mx-auto p-4 font-sans bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6 text-center text-yellow-400">McDonald's Order System</h1>

      <div className="mb-6 text-center">
        <button
          onClick={addNormalOrder}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg text-lg shadow-md transition duration-150 ease-in-out"
        >
          New Normal Order
        </button>
        {/* Add VIP Order button later */}
        {/* Add Bot controls later */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PENDING Area */}
        <div className="border border-gray-700 rounded-lg p-6 bg-gray-800 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center text-yellow-400">PENDING Orders</h2>
          {pendingOrders.length === 0 ? (
            <p className="text-center text-gray-400 italic">No pending orders.</p>
          ) : (
            <ul className="list-disc pl-5 text-gray-200 space-y-2">
              {pendingOrders.map(order => (
                <li key={order.id} className="mb-1">Order #{order.id}</li>
              ))}
            </ul>
          )}
        </div>

        {/* COMPLETE Area */}
        <div className="border border-green-700 rounded-lg p-6 bg-green-900 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center text-green-300">COMPLETE Orders</h2>
          {completeOrders.length === 0 ? (
            <p className="text-center text-gray-400 italic">No completed orders.</p>
          ) : (
            <ul className="list-disc pl-5 text-green-200 space-y-2">
              {completeOrders.map(order => (
                <li key={order.id} className="mb-1">Order #{order.id}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bot status area later */}

    </div>
  );
}
