import withRedux from 'next-redux-wrapper'
import Router from 'next/router'

import { initStore } from '../redux'

import Layout from '../layouts'

const About = () => (
  <Layout>
    <style jsx>{`
      .page-container {
        flex: 1;
      }
    `}</style>
    <div className="page-container">
      about
    </div>
  </Layout>
)

export default withRedux(initStore)(About)
