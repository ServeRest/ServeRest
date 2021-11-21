package test

import (
	"fmt"
	"io/ioutil"
	"testing"

	PackageJSON "github.com/cloudrecipes/packagejson"
	"github.com/gruntwork-io/terratest/modules/docker"
	"github.com/stretchr/testify/assert"
)

// Get package json version
func packageJsonVersion() string {
	packageJsonRaw, err := ioutil.ReadFile("../../package.json")
	if err != nil {
		fmt.Println(err)
	}
	packageJson, parseErr := PackageJSON.Parse(packageJsonRaw)
	if parseErr != nil {
		fmt.Println(parseErr)
	}
	return packageJson.Version
}

func TestDockerWithHelpFlag(t *testing.T) {
	// Configure the tag to use on the Docker image.
	tag := "serverest-terratest"
	buildOptions := &docker.BuildOptions{
		Tags: []string{tag},
		OtherOptions: []string{
			"--no-cache",
		},
	}

	// Build the Docker image.
	docker.Build(t, "../../", buildOptions)

	// Run the Docker image, read the text file from it, and make sure it contains the expected output.
	opts := &docker.RunOptions{Remove: true, Command: []string{"--help"}}
	output := docker.Run(t, tag, opts)

	// Assert message printed on docker run
	assert.Equal(t, output, "\n> serverest@"+packageJsonVersion()+" start\n> node ./src/server.js \"--help\"\n\nAjuda do ServeRest\n\nModo de uso: npx serverest <opcao>\n             docker run -p 3000:3000 paulogoncalvesbh/serverest <opcao>\n\nOptions:\n  -p, --porta     Porta que será utilizada (default: 3000)              [number]\n  -t, --timeout   Timeout da autenticação em segundos (default: 600)    [number]\n  -d, --nodoc     Desabilitar o início automático da documentação      [boolean]\n  -b, --nobearer  Não retornar \"Bearer\" no authorization de /login     [boolean]\n  -s, --nosec     Desabilitar os headers de segurança na resposta      [boolean]\n  -h, --help      Show help                                            [boolean]\n  -v, --version   Show version number                                  [boolean]\n\nExamples:\n  npx serverest                       Utilizar porta e timeout padrão\n  npx serverest --nodoc               Documentação não abrirá\n  npx serverest --timeout 3600        Token de autenticação terá 1h de duração\n  npx serverest --porta 3500          Será iniciado na porta 3500\n  npx serverest -s -p 4200 -t 120 -b  É possível combinar as opções\n\nAcesse serverest.dev para ver as rotas disponíveis\nPrecisa de ajuda?\nAbra uma issue em github.com/ServeRest/ServeRest/issues")
}
