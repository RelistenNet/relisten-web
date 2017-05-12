import withRedux from 'next-redux-wrapper'
import Router from 'next/router'

import { initStore } from '../redux'

import Layout from '../layouts'

const Navigation = () => (
  <Layout>
    <style jsx>{`
      .content {
        flex: 1;
      }
    `}</style>
    <div className="content">
      about
    </div>
  </Layout>
)

export default withRedux(initStore)(Navigation)
