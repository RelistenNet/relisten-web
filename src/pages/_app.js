import Head from 'next/head';

import '@fortawesome/fontawesome-free/css/all.css'; // import Font Awesome CSS

// next.js polyfills for IE11
import 'core-js/features/array/fill';
import 'core-js/features/array/find';
import 'core-js/features/array/includes';
import 'core-js/features/object/assign';
import 'core-js/features/object/entries';
import 'core-js/features/object/values';
import 'core-js/features/promise';
import 'core-js/features/string/ends-with'; // unsure if needed
import 'core-js/features/string/includes';
import 'core-js/features/string/starts-with';

import { useRouter } from 'next/router';
import { wrapper } from '../redux';
import { Provider } from 'react-redux';

// const SENTRY_PUBLIC_DSN = 'https://9113aa54177a4e9fa09ea0aeaf0558e1@scentry.typetwo.space/5';

const MyApp = ({ Component, ...rest }) => {
  const { store, props } = wrapper.useWrappedStore(rest);
  const router = useRouter();
  const fullPath = router.asPath;
  const content = 'app-id=715886886, app-argument=https://relisten.net' + fullPath;

  // React.useEffect(() => {
  //   Raven.config(SENTRY_PUBLIC_DSN).install();
  // }, []);

  return (
    <>
      <Head>
        <title>Relisten</title>
        <meta name="apple-itunes-app" content={content} />
      </Head>
      <Provider store={store}>
        <Component {...rest.pageProps} store={store} />
      </Provider>
    </>
  );
};

// MyApp.getInitialProps = wrapper.getInitialAppProps((store) => async ({ Component, ctx }) => {
//   // store.dispatch({ type: 'TOE', payload: 'was set in _app' });

//   return {
//     pageProps: {
//       // Call page-level getInitialProps
//       // DON'T FORGET TO PROVIDE STORE TO PAGE
//       ...(Component.getInitialProps ? await Component.getInitialProps({ ...ctx, store }) : {}),
//       // Some custom thing for all pages
//       pathname: ctx.pathname,
//     },
//   };
// });

export default MyApp;
