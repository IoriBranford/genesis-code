import { constants } from "buffer";
import * as vscode from "vscode";
import { DEFAULT_GENDEV_SGDK_MAKEFILE, DOCKER, DOCKERTAG, GENDEV_ENV, GENS_PATH, MAKEFILE, MARSDEV, MARSDEV_ENV, SGDK_GENDEV, TOOLCHAINTYPE, WIN32 } from "./constants";
import { AppModel } from "./IAppModel";
import * as Path from 'path';
import * as fs from 'fs';


export class AppModelLinux extends AppModel{


    public cleanProject(): boolean {
        let toolchainType = vscode.workspace.getConfiguration().get(TOOLCHAINTYPE);
        let makefile = vscode.workspace.getConfiguration().get(MAKEFILE);
        switch(toolchainType){
            case SGDK_GENDEV:
                return this.cleanProjectSgdk(makefile);
            case MARSDEV:
                return this.cleanProjectMarsDev(makefile);
            case DOCKER:
                return this.cleanProjectDocker();
            default:
                return false;
        }
    

    }
    cleanProjectDocker(): boolean {
        let tag = vscode.workspace.getConfiguration().get(DOCKERTAG);
        let dockerTag = tag !== "" ? tag : "sgdk";
        this.terminal.sendText(`docker run --rm -v \"$PWD\":/src -u $(id -u):$(id -g) ${dockerTag} clean`);
        return true;
    }    
    cleanProjectMarsDev(makefile:unknown): boolean {
        this.setmardevenv();
        let mkfile = (makefile !== "") ? "-f " + makefile : " ";
        this.terminal.sendText(`make ${mkfile} clean`);
        return true;    }

    setmardevenv() {
        let marsdev = vscode.workspace.getConfiguration().get(MARSDEV_ENV);

        this.terminal.sendText(`export MARSDEV=${marsdev}`,true);
    }
    public createProject(rootPath: vscode.Uri): vscode.Uri {
        let toolchainType = vscode.workspace.getConfiguration().get(TOOLCHAINTYPE);
        let sourcepath = Path.join(rootPath.fsPath, "src");
        if (!fs.existsSync(sourcepath)) {
            fs.mkdirSync(sourcepath);
        }
        let includePath = Path.join(rootPath.fsPath, "inc");
        if (!fs.existsSync(includePath)) {
            fs.mkdirSync(includePath);
            // Added gitkeep files to show it on git repo
            let gitinckeep = Path.join(this.extensionPath, "resources", "gitkeep.template");
            let gitinckeeppath = Path.join(rootPath.fsPath, "inc", ".gitkeep");
            fs.copyFileSync(gitinckeep, gitinckeeppath);
        }
        let resourcePath = Path.join(rootPath.fsPath, "res");
        if (!fs.existsSync(resourcePath)) {
            fs.mkdirSync(resourcePath);
            // Added gitkeep files to show it on git repo
            let gitreskeep = Path.join(this.extensionPath, "resources", "gitkeep.template");
            let gitreskeeppath = Path.join(rootPath.fsPath, "res", ".gitkeep");
            fs.copyFileSync(gitreskeep, gitreskeeppath);
        }
        //Add README.md File
        let readmetemppath = Path.join(this.extensionPath, "resources", "README.md.template");
        let readmemdpath = Path.join(rootPath.fsPath, "README.MD");
        fs.copyFileSync(readmetemppath, readmemdpath);
        //add .gitignorefile
        let ignoretemppath = Path.join(this.extensionPath, "resources", "gitignore.template");
        let ignorepath = Path.join(rootPath.fsPath, ".gitignore");
        fs.copyFileSync(ignoretemppath, ignorepath);
        //add main.c hello world Example
        let mainctemppath = Path.join(this.extensionPath, "resources", "mainc.template");
        let maincpath = Path.join(rootPath.fsPath, "src", "main.c");
        fs.copyFileSync(mainctemppath, maincpath);
        //add launch.json file with debuging configuration.
        let vscodedirpath = Path.join(rootPath.fsPath, ".vscode");
        if (!fs.existsSync(vscodedirpath)) {
            fs.mkdirSync(vscodedirpath);
            if (toolchainType === MARSDEV) {
                let sourcefile = Path.join(this.extensionPath, "resources", "launch.json.linuxmarsdev.template");
                fs.copyFileSync(sourcefile, Path.join(vscodedirpath, "launch.json"));
                let settingssourcefile = Path.join(this.extensionPath, "resources", "ccppsettings.linuxmarsdev.template");
                fs.copyFileSync(settingssourcefile, Path.join(vscodedirpath, "settings.json"));
            } else if (toolchainType === SGDK_GENDEV || toolchainType===DOCKER) {
                let sourcefile = Path.join(this.extensionPath, "resources", "ccppsettings.linuxgendev.template");
                fs.copyFileSync(sourcefile, Path.join(vscodedirpath, "settings.json"));
            }   
        }
        let makefiletemppath = Path.join(this.extensionPath, "resources", "Makefile.template");
        if (toolchainType === MARSDEV) {
            fs.copyFileSync(makefiletemppath, Path.join(rootPath.fsPath, "Makefile"));
            //add boot directory
            fs.mkdirSync(Path.join(rootPath.fsPath, "boot"));
            fs.copyFileSync(Path.join(this.extensionPath, "resources", "boot", "sega.s.template"), Path.join(rootPath.fsPath, "boot", "sega.s"));
            fs.copyFileSync(Path.join(this.extensionPath, "resources", "boot", "rom_head.c.template"), Path.join(rootPath.fsPath, "boot", "rom_head.c"));
        }
        
         //add git repository to the project
         this.terminal.sendText("cd \"" + rootPath.fsPath + "\" && git init");
         return rootPath;
    }

    public compileProject(newLine: boolean=true, withArg: string="release"): boolean {
        let toolchainType = vscode.workspace.getConfiguration().get(TOOLCHAINTYPE);
        let makefile:string = vscode.workspace.getConfiguration().get(MAKEFILE,DEFAULT_GENDEV_SGDK_MAKEFILE);
        switch(toolchainType){
            case SGDK_GENDEV:
                return this.compilesgdk(newLine,withArg, makefile);
            case MARSDEV:
                return this.compileMarsDev(newLine,withArg,makefile);
            case DOCKER:
                return this.compileDocker(newLine, withArg);
        }
        return false;
    }
    compileDocker(newLine: boolean, withArg: string): boolean {
        let tag = vscode.workspace.getConfiguration().get(DOCKERTAG);

        let dockerTag = this.getDockerImageTag();
        let dockerVolumeTag= this.getDockerVolumeTag();
        this.terminal.sendText(`docker run --rm -v \"$PWD\":${dockerVolumeTag} -u $(id -u):$(id -g) ${dockerTag} ${withArg}` , newLine);
        return true;
        }

    compileMarsDev(newLine: boolean=true, withArg: string, makefile:string): boolean {

        this.setmardevenv();
        let mkfile = (makefile !== "") ? "-f " + makefile : " ";
        this.terminal.sendText(`make  ${mkfile} clean ${withArg}`, newLine);
        return true;
    }
    compilesgdk(newLine: boolean, withArg: string, makefile:string): boolean {
        let gendev = vscode.workspace.getConfiguration().get(GENDEV_ENV);
        if (gendev !== "") {
            this.terminal.sendText(`export GENDEV=${gendev}`, true);
        }
        let cmakefile = (makefile !== "") ? makefile : DEFAULT_GENDEV_SGDK_MAKEFILE;
        this.terminal.sendText(`make -f ${cmakefile} ${withArg}`, newLine);   
        return true;
    }
    public compileAndRunProject(): boolean {
        let toolchainType = vscode.workspace.getConfiguration().get(TOOLCHAINTYPE);
        this.compileProject(false);
        this.terminal.sendText(" && ");
        this.runProject(true);
        return true;
    }
    public runProject(newLine: boolean): boolean {
        let genspath = vscode.workspace.getConfiguration().get(GENS_PATH);
        let toolchainType = vscode.workspace.getConfiguration().get(TOOLCHAINTYPE);
        let romPath = (toolchainType=== MARSDEV)? "$PWD/rom.bin":"$PWD/out/rom.bin";
        let command = `${genspath} "${romPath}"`;
        this.terminal.sendText(`${command} &`, newLine);
        return true;
    }
    public compileForDebugging(): boolean {
        let toolchainType = vscode.workspace.getConfiguration().get(TOOLCHAINTYPE);
        if(toolchainType=== SGDK_GENDEV){
            vscode.window.showErrorMessage("Toolchain SGDK/GENDEV can't compile for Debugging in Linux. Change to Marsdev or Docker on configuration.");
            return false;
        }
        return this.compileProject(true,"debug");
    }
    
    private cleanProjectSgdk(makefile:unknown):boolean {
        let gendev = vscode.workspace.getConfiguration().get(GENDEV_ENV);
        if (gendev !== "") {
          this.terminal.sendText(`export GENDEV=${gendev}`, true);
        }
        //linux
        let cmakefile = (makefile !== "") ? makefile : DEFAULT_GENDEV_SGDK_MAKEFILE;
        this.terminal.sendText(`make -f ${cmakefile} clean\n`);
        return true;    }
}


