/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Provider } from 'react-redux';
import { store } from './store/store';
import SplitPaneLayout from './components/Layout/SplitPaneLayout';

export default function App() {
  return (
    <Provider store={store}>
      <SplitPaneLayout />
    </Provider>
  );
}

