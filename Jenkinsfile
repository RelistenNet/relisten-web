pipeline {
    agent any
    environment { 
        APP_NAME = 'relisten-web'
        DOKKU_HOST = 'dumbledore.alecgorge.com'
    }
    stages {
        stage('Build and Deploy') {
            steps {
                sh """set -x
                    git remote add dokku dokku@${env.DOKKU_HOST}:${env.APP_NAME} || true
                    git push -f dokku \$(git rev-parse HEAD):refs/heads/master
                """

                retry(3) {
                    sh """set -x
                    curl -f 'http://${env.APP_NAME}.dumbledore.alecgorge.com/' > /dev/null
                    """
                }
            }
        }
    }
}
