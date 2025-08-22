import React from 'react';
import { Layout } from 'antd';
import ReviewPage from './components/ReviewPage';
import './App.css';

const { Header, Content } = Layout;

function App() {
  return (
    <Layout>
      <Header className="review-header">
        <h1 style={{ color: 'white', margin: 0 }}>商家合作查看系统</h1>
      </Header>
      <Content className="review-content">
        <ReviewPage />
      </Content>
    </Layout>
  );
}

export default App;
