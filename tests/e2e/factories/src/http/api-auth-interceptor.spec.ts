import axios, { AxiosInstance } from 'axios';
import moxios from 'moxios';
import { APIAuthInterceptor } from './api-auth-interceptor';

describe( 'APIAuthInterceptor', () => {
	let apiAuthInterceptor: APIAuthInterceptor;
	let axiosInstance: AxiosInstance;

	beforeEach( () => {
		axiosInstance = axios.create();
		moxios.install( axiosInstance );
		apiAuthInterceptor = new APIAuthInterceptor(
			axiosInstance,
			'consumer_key',
			'consumer_secret'
		);
		apiAuthInterceptor.start();
	} );

	afterEach( () => {
		apiAuthInterceptor.stop();
		moxios.uninstall( axiosInstance );
	} );

	it( 'should not run unless started', async () => {
		moxios.stubRequest( 'https://api.test', { status: 200 } );

		apiAuthInterceptor.stop();
		await axiosInstance.get( 'https://api.test' );

		let request = moxios.requests.mostRecent();
		expect( request.headers ).not.toHaveProperty( 'Authorization' );

		apiAuthInterceptor.start();
		await axiosInstance.get( 'https://api.test' );

		request = moxios.requests.mostRecent();
		expect( request.headers ).toHaveProperty( 'Authorization' );
	} );

	it( 'should use basic auth for HTTPS', async () => {
		moxios.stubRequest( 'https://api.test', { status: 200 } );
		await axiosInstance.get( 'https://api.test' );

		const request = moxios.requests.mostRecent();

		expect( request.headers ).toHaveProperty( 'Authorization' );
		expect( request.headers.Authorization ).toEqual(
			'Basic ' + btoa( 'consumer_key:consumer_secret' )
		);
	} );

	it( 'should use OAuth 1.0a for HTTP', async () => {
		moxios.stubRequest( 'http://api.test', { status: 200 } );
		await axiosInstance.get( 'http://api.test' );

		const request = moxios.requests.mostRecent();

		expect( request.headers ).toHaveProperty( 'Authorization' );
		expect( request.headers.Authorization ).toMatch( /^OAuth / );
		const header = request.headers.Authorization;

		// We're going to assume that the oauth-1.0a package added the signature data correctly so we will
		// focus on ensuring that the header looks roughly correct given what we readily know.
		const oauthArgs: any = {};
		for ( const arg of header.matchAll( /([A-Za-z0-9_]+)="([^"]+)"/g ) ) {
			oauthArgs[ arg[ 1 ] ] = arg[ 2 ];
		}

		expect( oauthArgs ).toMatchObject( {
			oauth_consumer_key: 'consumer_key',
			oauth_signature_method: 'HMAC-SHA256',
			oauth_version: '1.0',
		} );
	} );
} );