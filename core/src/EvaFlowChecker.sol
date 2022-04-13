//SPDX-License-Identifier: MIT
//Create by Openflow.network core team.
pragma solidity ^0.8.0;
import {IEvabaseConfig} from "./interfaces/IEvabaseConfig.sol";
import {IEvaFlow} from "./interfaces/IEvaFlow.sol";
import {IEvaFlowControler} from "./interfaces/IEvaFlowControler.sol";
import {Utils} from "./lib/Utils.sol";

contract EvaFlowChecker {
    IEvabaseConfig public config;
    IEvaFlowControler public evaFlowControler;

    uint32 public constant checkGasLimitMin = 4_000_0;
    uint32 private constant GAS_LIMIT = 2_000_000;
    uint256 public lastMoveTime;

    constructor(address _config, address _evaFlowControler) {
        require(_evaFlowControler != address(0), "addess is 0x");
        require(_config != address(0), "addess is 0x");

        evaFlowControler = IEvaFlowControler(_evaFlowControler);
        config = IEvabaseConfig(_config);
        lastMoveTime = block.timestamp;
    }

    function check(
        uint256 keepbotId,
        uint256 checkGasLimit,
        bytes memory checkdata
    ) external view returns (bool needExec, bytes memory execData) {
        uint32 batch = config.batchFlowNum();
        uint32 keepBotSize = config.keepBotSize();
        uint256 allVaildSize = evaFlowControler.getAllVaildFlowSize();
        uint256 bot1start = _getRandomStart(allVaildSize);
        (uint256 start, uint256 end) = _getAvailCircle(
            allVaildSize,
            keepBotSize,
            keepbotId,
            batch,
            bot1start
        );

        (uint256[] memory tmp, bytes[] memory executeDataArray) = _ring(
            start,
            end,
            allVaildSize,
            checkdata
        );
        // execData = Utils.encodeUints(tmp);
        execData = Utils._encodeTwoArr(tmp, executeDataArray);
        return (needExec, execData);
    }

    function setLastMoveTime() external {
        if (block.timestamp - lastMoveTime >= 10 seconds) {
            lastMoveTime = block.timestamp;
        }
    }

    function _ring(
        uint256 _start,
        uint256 _end,
        uint256 _allVaildSize,
        bytes memory _checkdata
    )
        internal
        view
        returns (uint256[] memory tmp, bytes[] memory executeDataArray)
    {
        uint256 j = 0;
        uint256 length = 0;
        if (_start > _end) {
            // start - allVaildSize
            length = _allVaildSize - _start + _end + 1;
            tmp = new uint256[](length);
            executeDataArray = new bytes[](length);
            // , _executeDataArray
            (tmp, j, executeDataArray) = _addVaildFlowIndex(
                _start,
                _allVaildSize,
                tmp,
                executeDataArray,
                _checkdata,
                j
            );
            // 0 - end
            (tmp, j, executeDataArray) = _addVaildFlowIndex(
                0,
                _end,
                tmp,
                executeDataArray,
                _checkdata,
                j
            );
        } else {
            length = _end - _start;
            tmp = new uint256[](length);
            executeDataArray = new bytes[](length);
            _addVaildFlowIndex(
                _start,
                _end,
                tmp,
                executeDataArray,
                _checkdata,
                j
            );
        }

        return (tmp, executeDataArray);
    }

    function _addVaildFlowIndex(
        uint256 _start,
        uint256 _end,
        uint256[] memory _tmp,
        bytes[] memory _executeDataArray,
        bytes memory _checkdata,
        uint256 j
    )
        internal
        view
        returns (
            uint256[] memory arr,
            uint256 k,
            bytes[] memory _arrayBytes
        )
    {
        uint256 totalGas;
        for (uint256 i = _start; i < _end; i++) {
            uint256 beforGas = gasleft();
            uint256 index = evaFlowControler.getIndexVaildFlow(i);

            // checkGasLimit/checkdata?
            if (index != uint256(0)) {
                (bool needExec, bytes memory executeData) = IEvaFlow(
                    evaFlowControler.getFlowMetas(index).lastVersionflow
                ).check(_checkdata);
                uint256 afterGas = gasleft();
                totalGas = totalGas + beforGas - afterGas;
                if (totalGas > GAS_LIMIT || afterGas < checkGasLimitMin) {
                    return (_tmp, j, _executeDataArray);
                }
                if (needExec) {
                    _tmp[j++] = index;
                    _executeDataArray[j++] = executeData;
                }
            }
        }

        return (_tmp, j, _executeDataArray);
    }

    function _getAvailCircle(
        uint256 _allVaildSize,
        uint256 _keepBotSize,
        uint256 _keepbotN,
        uint32 _batch,
        uint256 _bot1start
    ) internal view returns (uint256 botNIndexS, uint256 botNIndexE) {
        require(_keepBotSize > 0 && _allVaildSize > 0 && _keepbotN > 0, "gt 0");

        unchecked {
            uint256 quotient = _allVaildSize / _keepBotSize;
            uint256 remainder = _allVaildSize % _keepBotSize;

            if (remainder != 0) {
                quotient++;
            }

            bool isUseBatch = _batch < quotient;

            if (isUseBatch) {
                quotient = _batch;
            }

            //first find should index
            botNIndexS = _bot1start + (_keepbotN - 1) * quotient;
            botNIndexE = _bot1start + _keepbotN * quotient;

            //Both of these are outside the circle
            if (botNIndexS >= _allVaildSize) {
                botNIndexS = botNIndexS - _allVaildSize;
                botNIndexE = botNIndexE - _allVaildSize;

                if (botNIndexS > _bot1start) {
                    botNIndexS = botNIndexS % _allVaildSize;
                    botNIndexE = botNIndexE % _allVaildSize;
                }
            } else {
                if (botNIndexE > _allVaildSize) {
                    botNIndexE = botNIndexE - _allVaildSize - 1;
                    if (botNIndexE >= _bot1start) {
                        botNIndexE = _bot1start;
                    }
                }
            }
        }

        return (botNIndexS, botNIndexE);
    }

    function _getRandomStart(uint256 _flowSize)
        internal
        view
        returns (uint256 index)
    {
        if (block.timestamp - lastMoveTime >= 10 seconds) {
            index =
                uint256(keccak256(abi.encodePacked(block.timestamp))) %
                _flowSize;
        } else {
            index =
                uint256(keccak256(abi.encodePacked(lastMoveTime))) %
                _flowSize;
        }
    }
}
