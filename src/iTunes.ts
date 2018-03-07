import ITrack from "./ITrack";
import * as util from "util";
import { exec } from "child_process";
import * as applescript from "applescript";
import * as path from "path";

export default class iTunes {

    constructor(){

    }

    public getCurrentTrack(): Promise<{}> {
        return this.executeScript("currentTrack");
    }

    public play(): void {
        this.executeScript("play");
    }

    public pause(): void {
        this.executeScript("pause");
    }

    private executeScript( filename: string ) : Promise<{}>{
        return new Promise( ( resolve, reject ) => {
            let file = path.resolve(__dirname, `../../scripts/${filename}.applescript`);
            applescript.execFile( file , ( err, result ) => {
                if( err ){
                    reject( err );
                }

                if( result != null ){
                    resolve( JSON.parse( result.toString() ) );
                }else{
                    resolve({});
                }
            });
        });
    }
}