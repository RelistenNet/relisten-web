export default (props) => {
    const shareText = `Listening to ${props.yearString} ${props.title} by ${props.bandTitle} on @relistenapp`;
    const shareUrl = () => encodeURI(`https://twitter.com/intent/tweet?url=${window.location.origin}${next.router.asPath}&text=${shareText}`);

    return <div className="twitter-share">
        <style jsx>{`
        .twitter-share {
            display: inherit;
        }

        .twitter-share-button {
            background-color: #1b95e0;
            font:  normal normal normal 11px/18px 'Helvetica Neue',Arial,sans-serif;
            color: #fff;
            border-radius: 3px;
            border-style: none;
            cursor: pointer;
            margin: 10px;
        }

        @media (max-width: 480px) {
            .twitter-share {
                position: absolute;
                bottom: -70%;
                right: -10%;
            }
        }

        `}</style>
        
        <button className="twitter-share-button" onClick={() => window.open(shareUrl(), '_blank')} ><i className="fab fa-twitter"></i>  Share</button>
    </div>;
}